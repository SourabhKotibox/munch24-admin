import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Link2,
  ChevronLeft,
  X,
  Film,
  ImageIcon,
  Lock,
  Unlock,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetCategoryShowByContentId,
  useAppendCategoryShowVideo,
  useUpdateCategoryEpisodeLock,
  getImageUrl,
} from "../lib/api-client";

type UploadProgress = {
  loaded: number;
  total: number;
};

type Category = {
  id: string;
  name: string;
  description?: string;
};

type Episode = {
  id: string;
  episode: number;
  season?: number;
  title?: string;
  heading?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  isLocked: boolean;
  isFree: boolean;
  categories?: Category[];
  processingStatus?: string;
  hlsUrl?: string;
};

export default function CategoryShowDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { contentId } = useParams<{ contentId: string }>();
  const [, setLocation] = useLocation();

  const { data: showData } = useGetCategoryShowByContentId(contentId);
  const appendMutation = useAppendCategoryShowVideo();
  const lockMutation = useUpdateCategoryEpisodeLock();

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const uploadStartRef = useRef<number | null>(null);
  const [previewEpisode, setPreviewEpisode] = useState<Episode | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMode, setVideoMode] = useState("upload");
  const [formData, setFormData] = useState({
    reelDurationMinutes: 3,
    totalDurationMinutes: "",
    freeEpisodeCount: 1,
    lockEpisodes: true,
    thumbnail: "",
    videoUrl: "",
  });

  const episodes: Episode[] = showData?.episodes || [];
  
  const seasons = Array.from(new Set(episodes.map((e) => e.season || 1))).sort((a, b) => a - b);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  
  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);

  const filteredEpisodes = episodes.filter((e) => (e.season || 1) === selectedSeason);

  const formatDuration = (seconds?: number) => {
    if (!seconds || !Number.isFinite(seconds)) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 MB";
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatUploadSpeed = (bytesPerSecond: number) => {
    if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "";
    const megabytesPerSecond = bytesPerSecond / (1024 * 1024);
    if (megabytesPerSecond >= 1) {
      return `${megabytesPerSecond.toFixed(1)} MB/s`;
    }
    return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  };

  const handleAppendVideo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadSpeed("");
      uploadStartRef.current = null;
      
      const formDataToSend = new FormData();
      formDataToSend.append("reelDurationMinutes", formData.reelDurationMinutes.toString());
      if (formData.totalDurationMinutes) {
        formDataToSend.append("totalDurationMinutes", formData.totalDurationMinutes);
      }
      formDataToSend.append("freeEpisodeCount", formData.freeEpisodeCount.toString());
      formDataToSend.append("lockEpisodes", formData.lockEpisodes.toString());

      if (videoMode === "url") {
        if (formData.videoUrl) {
          formDataToSend.append("videoUrl", formData.videoUrl);
        }
      } else if (videoFile) {
        formDataToSend.append("videoFile", videoFile);
      }

      const onUploadProgress = (progress: UploadProgress) => {
        if (!uploadStartRef.current) {
          uploadStartRef.current = Date.now();
        }

        const percentage = progress.total
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;
        const elapsedSeconds = (Date.now() - uploadStartRef.current) / 1000;
        const bytesPerSecond = elapsedSeconds > 0 ? progress.loaded / elapsedSeconds : 0;

        setUploadProgress(percentage);
        setUploadSpeed(formatUploadSpeed(bytesPerSecond));
      };

      await appendMutation.mutateAsync({ contentId, data: formDataToSend, onUploadProgress });
      toast({ title: "Episodes added! HLS processing started in background." });

      queryClient.invalidateQueries({ queryKey: ["category-show"] });
      setVideoFile(null);
    } catch (error) {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadSpeed("");
      uploadStartRef.current = null;
    }
  };

  const handleToggleLock = async (episode: Episode) => {
    try {
      await lockMutation.mutateAsync({
        episodeId: episode.id,
        isLocked: !episode.isLocked,
      });
      queryClient.invalidateQueries({ queryKey: ["category-show"] });
      toast({ title: `Episode ${episode.isLocked ? "unlocked" : "locked"}!` });
    } catch (error) {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {showData?.content?.title || "Show Details"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Episodes</CardTitle>
              <CardDescription>Manage your show episodes</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {seasons.length > 0 && (
                <Select
                  value={selectedSeason.toString()}
                  onValueChange={(val) => setSelectedSeason(Number(val))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select Season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season} value={season.toString()}>
                        Season {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Badge variant="outline">{filteredEpisodes.length} episodes</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEpisodes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No episodes yet</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Heading</TableHead>
                      <TableHead className="hidden sm:table-cell">Duration</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Access</TableHead>
                      <TableHead className="hidden lg:table-cell">Categories</TableHead>
                      <TableHead className="text-right w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEpisodes.map((episode) => (
                      <TableRow key={episode.id}>
                        <TableCell className="font-medium">{episode.episode}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {episode.thumbnail && (
                              <img
                                src={getImageUrl(episode.thumbnail)}
                                alt=""
                                className="h-10 w-14 object-contain rounded bg-gray-800"
                              />
                            )}
                            <div>
                              <div>{episode.title}</div>
                              {episode.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                  {episode.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{episode.heading}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{formatDuration(episode.duration)}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={episode.processingStatus === "ready" ? "default" : "outline"}>
                            {episode.processingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex gap-1">
                            {episode.isFree && (
                              <Badge variant="default" className="bg-green-500/15 text-green-500 hover:bg-green-500/25">Free</Badge>
                            )}
                            {episode.isLocked && (
                              <Badge variant="outline" className="text-amber-500">Locked</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {episode.categories?.map((cat) => (
                              <Badge key={cat.id} variant="outline" className="text-xs">
                                {cat.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {episode.hlsUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewEpisode(episode)}
                              aria-label="Preview episode"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleLock(episode)}
                            disabled={lockMutation.isPending}
                            aria-label={episode.isLocked ? "Unlock episode" : "Lock episode"}
                          >
                            {episode.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={!!previewEpisode} onOpenChange={(open) => !open && setPreviewEpisode(null)}>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{previewEpisode?.title || "Preview Episode"}</DialogTitle>
                    </DialogHeader>
                    {previewEpisode?.hlsUrl && (
                      <video
                        src={getImageUrl(previewEpisode.hlsUrl)}
                        controls
                        className="w-full rounded-lg"
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Add More Episodes</CardTitle>
            </div>
            <CardDescription>Upload another video to add more episodes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAppendVideo} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="reelDurationMinutes">Reel Duration (minutes)</Label>
                  <Input
                    id="reelDurationMinutes"
                    type="number"
                    min="1"
                    value={formData.reelDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, reelDurationMinutes: parseInt(e.target.value, 10) || 3 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalDurationMinutes">Total Duration (minutes)</Label>
                  <Input
                    id="totalDurationMinutes"
                    type="number"
                    min="1"
                    placeholder="Required if ffprobe is unavailable"
                    value={formData.totalDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, totalDurationMinutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="freeEpisodeCount">Free Episode Count</Label>
                  <Input
                    id="freeEpisodeCount"
                    type="number"
                    min="0"
                    value={formData.freeEpisodeCount}
                    onChange={(e) => setFormData({ ...formData, freeEpisodeCount: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Label htmlFor="lockEpisodes">Lock Episodes</Label>
                    <p className="text-xs text-muted-foreground">Lock episodes after free ones</p>
                  </div>
                  <Switch
                    id="lockEpisodes"
                    checked={formData.lockEpisodes}
                    onCheckedChange={(checked) => setFormData({ ...formData, lockEpisodes: checked })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Video File *</Label>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={videoMode === "url" ? "default" : "outline"}
                      onClick={() => setVideoMode("url")}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={videoMode === "upload" ? "default" : "outline"}
                      onClick={() => setVideoMode("upload")}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                  {videoMode === "url" && (
                    <Input
                      placeholder="https://example.com/video.mp4"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    />
                  )}
                  {videoMode === "upload" && (
                    <div className="space-y-4">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        required
                      />
                      {videoFile && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{videoFile.name} ({formatBytes(videoFile.size)})</span>
                          <Button variant="ghost" size="icon" type="button" onClick={() => setVideoFile(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadSpeed ? `${uploadProgress}% · ${uploadSpeed}` : `${uploadProgress}%`}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-linear"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={appendMutation.isPending || isUploading}
                >
                  Add Episodes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
