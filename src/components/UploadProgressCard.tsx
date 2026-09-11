import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { DirectUploadProgress, UploadPhase } from "@/lib/directUpload";
import { formatBytes, formatRemaining, formatSpeed } from "@/lib/directUpload";

const PHASE_LABEL: Record<UploadPhase, string> = {
  preparing: "Preparing upload",
  uploading: "Uploading...",
  completing: "Finalizing upload",
  uploaded: "Upload complete",
  processing: "Processing",
  transcoding: "Transcoding",
  ready: "Ready",
  failed: "Failed",
};

export default function UploadProgressCard({
  progress,
  fileName,
  error,
  onRetry,
  onCancel,
}: {
  progress: DirectUploadProgress;
  fileName?: string;
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  const uploadActive = progress.phase === "preparing" || progress.phase === "uploading" || progress.phase === "completing";
  const barValue = progress.phase === "transcoding" || progress.phase === "processing"
    ? 80
    : progress.percent;

  return (
    <div className="w-full space-y-2 text-left bg-muted/30 p-4 rounded-xl border border-border">
      {fileName && <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>}
      <div className="flex justify-between text-sm font-medium">
        <span>{error ? "Failed" : PHASE_LABEL[progress.phase]}</span>
        <span>{uploadActive ? `${progress.percent}%` : progress.phase === "ready" ? "100%" : progress.phase === "uploaded" ? "100%" : ""}</span>
      </div>
      <Progress value={error ? 0 : barValue} />
      {uploadActive && (
        <>
          <div className="text-xs text-foreground/65">
            {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
          </div>
          <div className="flex justify-between text-xs text-foreground/65">
            <span>Speed: {formatSpeed(progress.speedBps)}</span>
            <span>Remaining: {formatRemaining(progress.remainingSeconds)}</span>
          </div>
        </>
      )}
      {progress.phase === "transcoding" && (
        <p className="text-xs text-foreground/65">Upload complete. Generating HLS for playback…</p>
      )}
      {(error || progress.phase === "failed") && (
        <p className="text-xs text-destructive">{error || progress.message}</p>
      )}
      {(onRetry || onCancel) && (
        <div className="flex gap-2 pt-1">
          {onCancel && uploadActive && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          )}
          {onRetry && (progress.phase === "failed" || error) && (
            <Button type="button" size="sm" onClick={onRetry}>Retry</Button>
          )}
        </div>
      )}
    </div>
  );
}
