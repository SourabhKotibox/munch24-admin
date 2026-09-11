export type UploadPhase =
  | "preparing"
  | "uploading"
  | "completing"
  | "uploaded"
  | "processing"
  | "transcoding"
  | "ready"
  | "failed";

export type DirectUploadProgress = {
  phase: UploadPhase;
  loaded: number;
  total: number;
  percent: number;
  speedBps: number;
  remainingSeconds: number | null;
  message: string;
};

export type DirectUploadResult = {
  data: any[];
  mode: "multipart" | "proxy";
};

type ProgressCb = (progress: DirectUploadProgress) => void;

const CONCURRENCY = Math.max(1, Number(import.meta.env.VITE_UPLOAD_PART_CONCURRENCY || 4));
const STORAGE_PREFIX = "munch24-direct-upload:";

const apiBase = () => import.meta.env.VITE_API_URL || "http://localhost:3000";

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("adminAccessToken") || localStorage.getItem("appAccessToken") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatPhaseMessage = (phase: UploadPhase) => {
  switch (phase) {
    case "preparing": return "Preparing upload";
    case "uploading": return "Uploading...";
    case "completing": return "Finalizing upload";
    case "uploaded": return "Upload complete";
    case "processing": return "Processing";
    case "transcoding": return "Transcoding";
    case "ready": return "Ready";
    case "failed": return "Failed";
    default: return phase;
  }
};

const resumeKey = (folderId: string, file: File) =>
  `${STORAGE_PREFIX}${folderId}:${file.name}:${file.size}:${file.lastModified}`;

const apiJson = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(`${apiBase()}/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || "Upload request failed");
  }
  return data;
};

const emit = (
  onProgress: ProgressCb | undefined,
  phase: UploadPhase,
  loaded: number,
  total: number,
  startedAt: number
) => {
  const elapsed = Math.max(0.001, (Date.now() - startedAt) / 1000);
  const speedBps = loaded / elapsed;
  const remaining = loaded > 0 && loaded < total ? Math.round((total - loaded) / Math.max(speedBps, 1)) : loaded >= total ? 0 : null;
  onProgress?.({
    phase,
    loaded,
    total,
    percent: total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0,
    speedBps,
    remainingSeconds: remaining,
    message: formatPhaseMessage(phase),
  });
};

const putPart = (
  url: string,
  blob: Blob,
  signal: AbortSignal,
  onChunkProgress: (loaded: number) => void
): Promise<string> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onChunkProgress(event.loaded);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("DigitalOcean did not return an ETag for this part"));
          return;
        }
        resolve(etag);
      } else {
        reject(new Error(`Part upload failed (${xhr.status})`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error while uploading part")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
    const onAbort = () => xhr.abort();
    signal.addEventListener("abort", onAbort);
    xhr.addEventListener("loadend", () => signal.removeEventListener("abort", onAbort));
    xhr.send(blob);
  });

const uploadPartWithRetry = async (
  url: string,
  blob: Blob,
  signal: AbortSignal,
  onChunkProgress: (loaded: number) => void,
  retries = 3
): Promise<string> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await putPart(url, blob, signal, onChunkProgress);
    } catch (error: any) {
      lastError = error;
      if (signal.aborted || error?.message === "Upload cancelled") throw error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError || new Error("Part upload failed");
};

const proxyUpload = async (
  folderId: string,
  files: File[],
  source: string | undefined,
  onProgress: ProgressCb | undefined,
  signal: AbortSignal
) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("file", file));
  if (source) formData.append("source", source);

  const startedAt = Date.now();
  emit(onProgress, "uploading", 0, files.reduce((sum, file) => sum + file.size, 0), startedAt);

  const data = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBase()}/api/media/folders/${folderId}/files`);
    const headers = authHeaders();
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        emit(onProgress, "uploading", event.loaded, event.total, startedAt);
      }
    });
    xhr.addEventListener("load", () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json.error || "Upload failed"));
      } catch {
        reject(new Error("Failed to parse upload response"));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
    signal.addEventListener("abort", () => xhr.abort());
    xhr.send(formData);
  });

  const total = files.reduce((sum, file) => sum + file.size, 0);
  onProgress?.({
    phase: "uploaded",
    loaded: total,
    total,
    percent: 100,
    speedBps: 0,
    remainingSeconds: 0,
    message: "Upload complete",
  });
  return { data: data.data || [], mode: "proxy" as const };
};

const uploadSingleDirect = async (
  folderId: string,
  file: File,
  source: string | undefined,
  onProgress: ProgressCb | undefined,
  signal: AbortSignal
) => {
  const startedAt = Date.now();
  emit(onProgress, "preparing", 0, file.size, startedAt);

  const storedSessionId = localStorage.getItem(resumeKey(folderId, file)) || undefined;
  const init = await apiJson("/media/direct-upload/init", {
    method: "POST",
    body: JSON.stringify({
      folderId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      lastModified: file.lastModified,
      source,
      resumeSessionId: storedSessionId,
    }),
    signal,
  });

  if (init.data?.mode === "proxy") {
    return (await proxyUpload(folderId, [file], source, onProgress, signal)).data[0];
  }

  const sessionId = init.data.sessionId as string;
  const partSize = init.data.partSize as number;
  localStorage.setItem(resumeKey(folderId, file), sessionId);

  const existingParts = new Map<number, { etag: string; size: number }>();
  for (const part of init.data.uploadedParts || []) {
    existingParts.set(part.partNumber, { etag: part.etag, size: part.size || 0 });
  }

  const partCount = Math.ceil(file.size / partSize);
  const completed: Array<{ partNumber: number; etag: string; size: number }> = [];
  const partLoaded = new Array(partCount + 1).fill(0);

  for (const [partNumber, part] of existingParts.entries()) {
    completed.push({ partNumber, etag: part.etag, size: part.size });
    partLoaded[partNumber] = part.size || partSize;
  }

  const loadedBytes = () => partLoaded.reduce((sum, value) => sum + value, 0);
  emit(onProgress, "uploading", loadedBytes(), file.size, startedAt);

  const pending = [];
  for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
    if (existingParts.has(partNumber)) continue;
    pending.push(partNumber);
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length || 1) }, async () => {
    while (cursor < pending.length) {
      if (signal.aborted) throw new Error("Upload cancelled");
      const partNumber = pending[cursor];
      cursor += 1;
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);
      const signed = await apiJson(`/media/direct-upload/${sessionId}/sign-part`, {
        method: "POST",
        body: JSON.stringify({ partNumber }),
        signal,
      });
      const etag = await uploadPartWithRetry(signed.data.uploadUrl, blob, signal, (loaded) => {
        partLoaded[partNumber] = loaded;
        emit(onProgress, "uploading", Math.min(loadedBytes(), file.size - 1), file.size, startedAt);
      });
      partLoaded[partNumber] = blob.size;
      completed.push({ partNumber, etag, size: blob.size });
      emit(onProgress, "uploading", Math.min(loadedBytes(), file.size - 1), file.size, startedAt);
    }
  });

  try {
    await Promise.all(workers);
  } catch (error) {
    if (signal.aborted) {
      await apiJson(`/media/direct-upload/${sessionId}/abort`, { method: "POST", body: "{}" }).catch(() => undefined);
      localStorage.removeItem(resumeKey(folderId, file));
    }
    throw error;
  }

  emit(onProgress, "completing", file.size - 1, file.size, startedAt);
  const completedRes = await apiJson(`/media/direct-upload/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify({ parts: completed.sort((a, b) => a.partNumber - b.partNumber) }),
    signal,
  });
  localStorage.removeItem(resumeKey(folderId, file));

  onProgress?.({
    phase: completedRes.data?.mediaFile?.hlsStatus === "pending" || completedRes.data?.status === "transcoding"
      ? "transcoding"
      : "uploaded",
    loaded: file.size,
    total: file.size,
    percent: 100,
    speedBps: file.size / Math.max(0.001, (Date.now() - startedAt) / 1000),
    remainingSeconds: 0,
    message: "Upload complete",
  });

  return completedRes.data?.mediaFile || completedRes.data;
};

export const uploadFilesDirect = async (
  folderId: string,
  files: File[],
  source?: string,
  onProgress?: ProgressCb,
  signal?: AbortSignal
): Promise<DirectUploadResult> => {
  const abortSignal = signal || new AbortController().signal;
  const uploaded: any[] = [];
  let usedProxy = false;

  for (const file of files) {
    try {
      const result = await uploadSingleDirect(folderId, file, source, onProgress, abortSignal);
      uploaded.push(result);
    } catch (error: any) {
      if (abortSignal.aborted || error?.message === "Upload cancelled") throw error;
      const message = String(error?.message || "").toLowerCase();
      const canProxy = message.includes("etag") || message.includes("network") || message.includes("cors") || message.includes("failed to fetch");
      if (canProxy) {
        const stored = localStorage.getItem(resumeKey(folderId, file));
        if (stored) {
          await apiJson(`/media/direct-upload/${stored}/abort`, { method: "POST", body: "{}" }).catch(() => undefined);
          localStorage.removeItem(resumeKey(folderId, file));
        }
        const proxy = await proxyUpload(folderId, [file], source, onProgress, abortSignal);
        uploaded.push(...proxy.data);
        usedProxy = true;
        continue;
      }
      throw error;
    }
  }

  return { data: uploaded, mode: usedProxy ? "proxy" : "multipart" };
};

export const getMediaFileStatus = async (id: string) => {
  return apiJson(`/media/files/${id}/status`);
};

export const pollMediaUntilReady = async (
  id: string,
  onProgress?: ProgressCb,
  intervalMs = 4000,
  timeoutMs = 2 * 60 * 60 * 1000
) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = await getMediaFileStatus(id);
    const data = status.data;
    if (data.failed) {
      onProgress?.({
        phase: "failed",
        loaded: 1,
        total: 1,
        percent: 100,
        speedBps: 0,
        remainingSeconds: 0,
        message: data.hlsError || data.uploadError || "Processing failed",
      });
      return data;
    }
    if (data.playbackReady || data.ready) {
      onProgress?.({
        phase: "ready",
        loaded: 1,
        total: 1,
        percent: 100,
        speedBps: 0,
        remainingSeconds: 0,
        message: "Ready",
      });
      return data;
    }
    onProgress?.({
      phase: data.transcoding ? "transcoding" : "processing",
      loaded: 0,
      total: 1,
      percent: 0,
      speedBps: 0,
      remainingSeconds: null,
      message: data.transcoding ? "Transcoding" : "Processing",
    });
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for transcoding");
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

export const formatSpeed = (bps: number) => {
  if (!bps || bps < 1) return "0 B/s";
  return `${formatBytes(bps, 1)}/s`;
};

export const formatRemaining = (seconds: number | null) => {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return `${minutes}m ${rem}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};
