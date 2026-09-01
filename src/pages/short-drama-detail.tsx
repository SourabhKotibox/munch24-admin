import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Edit, Plus, Trash2, Lock, Unlock, Play,
  Upload, Link2, Loader2, Film, AlertTriangle, X, Clock,
  ChevronDown, ChevronUp, CheckCircle2, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetContentById, useAppendContentVideo, useUpdateContentEpisodeLock,
  useDeleteEpisode, getImageUrl,
} from "@/lib/api-client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_EPISODE_MINUTES = 3;

type Episode = {
  id: string; _id?: string;
  season: number; episode: number;
  title?: string; thumbnail?: string; duration?: number;
  isLocked: boolean; isFree: boolean;
  processingStatus?: string; hlsUrl?: string;
};

function fmt(s?: number) {
  if (!s || !Number.isFinite(s)) return "—";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    ready:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    queued:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
    processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    failed:     "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const s = status?.toLowerCase() || "queued";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${map[s] || map.queued}`}>
      {status || "queued"}
    </span>
  );
}

// ── Add Season Form ──────────────────────────────────────────────────────────
function AddSeasonForm({
  contentId,
  nextSeason,
  onDone,
}: {
  contentId: string;
  nextSeason: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const appendMutation = useAppendContentVideo();
  const queryClient = useQueryClient();

  const [videoMode, setVideoMode] = useState<"upload" | "url">("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [durationError, setDurationError] = useState("");
  const [freeEp, setFreeEp] = useState(1);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState("");
  const startRef = useRef<number | null>(null);

  const validateVideoDuration = (file: File): Promise<boolean> =>
    new Promise((resolve) => {
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(vid.src);
        if (vid.duration > MAX_EPISODE_MINUTES * 60) {
          setDurationError(`Video is ${Math.round(vid.duration)}s. Short drama episodes must be ≤ ${MAX_EPISODE_MINUTES} minutes (${MAX_EPISODE_MINUTES * 60}s).`);
          resolve(false);
        } else {
          setDurationError("");
          resolve(true);
        }
      };
      vid.onerror = () => { setDurationError(""); resolve(true); };
      vid.src = URL.createObjectURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setVideoFile(f);
    await validateVideoDuration(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (videoMode === "upload" && !videoFile) {
      toast({ title: "Select a video file", variant: "destructive" }); return;
    }
    if (videoMode === "upload" && videoFile) {
      const ok = await validateVideoDuration(videoFile);
      if (!ok) return;
    }

    const fd = new FormData();
    fd.append("reelDurationMinutes", String(MAX_EPISODE_MINUTES));
    fd.append("freeEpisodeCount", String(freeEp));
    fd.append("lockEpisodes", "true");
    fd.append("season", String(nextSeason));
    if (videoMode === "url") fd.append("videoUrl", videoUrl);
    else if (videoFile) fd.append("videoFile", videoFile);

    try {
      startRef.current = null;
      await appendMutation.mutateAsync({
        contentId,
        data: fd,
        onUploadProgress: (p: any) => {
          if (!startRef.current) startRef.current = Date.now();
          const pct = p.total ? Math.round((p.loaded / p.total) * 100) : 0;
          const bps = ((Date.now() - (startRef.current || Date.now())) / 1000) > 0
            ? p.loaded / ((Date.now() - (startRef.current!)) / 1000) : 0;
          setProgress(pct);
          setSpeed(bps > 1024 * 1024 ? `${(bps / 1024 / 1024).toFixed(1)} MB/s` : `${(bps / 1024).toFixed(0)} KB/s`);
        },
      });
      queryClient.invalidateQueries({ queryKey: ["content", contentId] });
      toast({ title: `Season ${nextSeason} added! HLS processing started.` });
      onDone();
    } catch (err: any) {
      toast({ title: err?.message || "Upload failed", variant: "destructive" });
    } finally {
      setProgress(0); setSpeed("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
          <Film className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold text-foreground">Add Season {nextSeason}</span>
        <span className="text-xs text-muted-foreground ml-1">· max {MAX_EPISODE_MINUTES} min per episode</span>
      </div>

      {durationError && (
        <div className="flex items-start gap-2 mt-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {durationError}
        </div>
      )}

      {/* Video source toggle */}
      <div className="flex gap-2">
        {(["upload", "url"] as const).map((m) => (
          <Button key={m} type="button" variant={videoMode === m ? "default" : "outline"} onClick={() => setVideoMode(m)} className="gap-2 h-9">
            {m === "upload" ? <Upload className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {m === "upload" ? "Upload File" : "URL"}
          </Button>
        ))}
      </div>

      {videoMode === "url" ? (
        <Input
          type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required
          placeholder="https://example.com/video.mp4"
          className="w-full bg-card border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
        />
      ) : (
        <div className="space-y-4">
          <Input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            required
            className="bg-card border-border text-foreground"
          />
          {videoFile && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{videoFile.name}</span>
              <Button variant="ghost" size="icon" type="button" onClick={() => setVideoFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-foreground whitespace-nowrap">Free Episodes</Label>
          <Input type="number" min={0} value={freeEp} onChange={(e) => setFreeEp(Number(e.target.value))}
            className="w-20 bg-card border-border text-foreground text-center h-9" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" /> Each episode ≤ {MAX_EPISODE_MINUTES} min
        </div>
      </div>

      {appendMutation.isPending && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading…</span>
            <span>{progress}%{speed ? ` · ${speed}` : ""}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={appendMutation.isPending || !!durationError} className="gap-2 h-9">
          {appendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {appendMutation.isPending ? "Processing…" : `Add Season ${nextSeason}`}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} className="h-9">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ShortDramaDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: showData, isLoading } = useGetContentById(id);
  const lockMutation = useUpdateContentEpisodeLock();
  const deleteEpisodeMutation = useDeleteEpisode();

  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({ 1: true });
  const [addingSeasonForm, setAddingSeasonForm] = useState(false);
  const [confirmDeleteEp, setConfirmDeleteEp] = useState<Episode | null>(null);
  const [previewEp, setPreviewEp] = useState<Episode | null>(null);

  const content = showData?.content;
  const allEpisodes: Episode[] = showData?.episodes || [];

  // Group by season
  const seasonMap = allEpisodes.reduce<Record<number, Episode[]>>((acc, ep) => {
    const s = ep.season || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(ep);
    return acc;
  }, {});
  const seasons = Object.keys(seasonMap).map(Number).sort((a, b) => a - b);
  const nextSeason = seasons.length > 0 ? Math.max(...seasons) + 1 : 1;

  const toggleSeason = (s: number) =>
    setExpandedSeasons((prev) => ({ ...prev, [s]: !prev[s] }));

  const handleToggleLock = async (ep: Episode) => {
    try {
      await lockMutation.mutateAsync({ episodeId: ep.id || ep._id, isLocked: !ep.isLocked });
      queryClient.invalidateQueries({ queryKey: ["content", id] });
      toast({ title: `Episode ${ep.isLocked ? "unlocked" : "locked"}` });
    } catch {
      toast({ title: "Failed to update lock", variant: "destructive" });
    }
  };

  const handleDeleteEpisode = async () => {
    if (!confirmDeleteEp) return;
    try {
      await deleteEpisodeMutation.mutateAsync(confirmDeleteEp.id || confirmDeleteEp._id);
      queryClient.invalidateQueries({ queryKey: ["content", id] });
      toast({ title: `Episode ${confirmDeleteEp.episode} deleted` });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setConfirmDeleteEp(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => setLocation("/short-dramas")}>
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {content?.title || "Short Drama Details"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {seasons.length} {seasons.length === 1 ? "season" : "seasons"} · {allEpisodes.length} {allEpisodes.length === 1 ? "episode" : "episodes"}
            <span className="ml-2 text-primary font-semibold">· max {MAX_EPISODE_MINUTES} min per episode</span>
          </p>
        </div>
        <Button onClick={() => setLocation(`/short-dramas/${id}/edit`)} variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Edit Drama
        </Button>
        {!addingSeasonForm && (
          <Button onClick={() => setAddingSeasonForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Season {nextSeason}
          </Button>
        )}
      </div>

      {/* ── Add Season Form ── */}
      {addingSeasonForm && (
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Add Season {nextSeason}</CardTitle>
            <CardDescription>Upload a video to add a new season of episodes</CardDescription>
          </CardHeader>
          <CardContent>
            <AddSeasonForm contentId={id} nextSeason={nextSeason} onDone={() => setAddingSeasonForm(false)} />
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ── */}
      {seasons.length === 0 && !addingSeasonForm && (
        <Card className="rounded-lg border-dashed border-2 p-12 text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-4">
            <Film className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">No seasons yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload the first video to create Season 1</p>
            </div>
            <Button onClick={() => setAddingSeasonForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Season 1
            </Button>
          </div>
        </Card>
      )}

      {/* ── Seasons ── */}
      <div className="space-y-4">
        {seasons.map((seasonNum) => {
          const eps = (seasonMap[seasonNum] || []).sort((a, b) => a.episode - b.episode);
          const expanded = expandedSeasons[seasonNum] !== false;

          return (
            <Card key={seasonNum} className="rounded-lg shadow-sm overflow-hidden">
              {/* Season header */}
              <button
                onClick={() => toggleSeason(seasonNum)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">S{seasonNum}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">Season {seasonNum}</p>
                  <p className="text-xs text-muted-foreground">{eps.length} episodes</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{eps.filter(e => e.processingStatus === "ready").length}/{eps.length} ready</Badge>
                  {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Episodes table */}
              {expanded && (
                <CardContent className="p-0 border-t border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden sm:table-cell text-center w-[100px]">Duration</TableHead>
                        <TableHead className="hidden md:table-cell text-center w-[120px]">Status</TableHead>
                        <TableHead className="hidden sm:table-cell text-center w-[100px]">Access</TableHead>
                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eps.map((ep) => {
                        const epId = ep.id || ep._id || "";
                        const dur = ep.duration || 0;
                        const overLimit = dur > MAX_EPISODE_MINUTES * 60;

                        return (
                          <TableRow key={epId}>
                            <TableCell className="font-medium">{ep.episode}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-14 rounded overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                                  {ep.thumbnail ? (
                                    <img src={getImageUrl(ep.thumbnail)} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Film className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="font-medium text-sm text-foreground">
                                  {ep.title || `Episode ${ep.episode}`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-center">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${overLimit ? "text-primary" : "text-muted-foreground"}`}>
                                {fmt(ep.duration)}
                                {overLimit && <AlertTriangle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-center">
                              <StatusBadge status={ep.processingStatus} />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-center">
                              <Badge variant={ep.isFree ? "default" : "outline"}>
                                {ep.isFree ? "Free" : "Paid"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {ep.hlsUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPreviewEp(ep)}
                                    className="h-8 w-8 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleLock(ep)}
                                  disabled={lockMutation.isPending}
                                  className="h-8 w-8"
                                >
                                  {lockMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : ep.isLocked ? (
                                    <Lock className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <Unlock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setConfirmDeleteEp(ep)}
                                  className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Delete Episode Confirm ── */}
      <AlertDialog open={!!confirmDeleteEp} onOpenChange={() => setConfirmDeleteEp(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80">
              Are you sure you want to delete Episode {confirmDeleteEp?.episode} of Season {confirmDeleteEp?.season}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEpisode} className="bg-primary hover:bg-primary/90 text-white border-0">
              {deleteEpisodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Preview Dialog ── */}
      <Dialog open={!!previewEp} onOpenChange={(open) => !open && setPreviewEp(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewEp?.title || `Episode ${previewEp?.episode}`}</DialogTitle>
          </DialogHeader>
          {previewEp?.hlsUrl && (
            <video src={getImageUrl(previewEp.hlsUrl)} controls className="w-full rounded-lg bg-black" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
