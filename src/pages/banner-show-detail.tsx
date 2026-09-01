import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import type { FormEvent } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Link2,
  ChevronLeft,
  X,
  Film,
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
  useGetBannerShowByContentId,
  useAppendBannerShowVideo,
  useUpdateEpisodeLock,
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

function PreviewVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const isM3u8 = src.includes(".m3u8");

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return <video ref={videoRef} controls className={className} />;
}

export default function BannerShowDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { contentId } = useParams<{ contentId: string }>();
  const [, setLocation] = useLocation();

  const { data: showData } = useGetBannerShowByContentId(contentId);
  const appendMutation = useAppendBannerShowVideo();
  const lockMutation = useUpdateEpisodeLock();

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

      queryClient.invalidateQueries({ queryKey: ["banner-show"] });
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
      queryClient.invalidateQueries({ queryKey: ["banner-show"] });
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
            {showData?.content?.title || "Banner Show Details"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {showData?.content?.contentType === "movie" ? "Movie Preview" : `${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"}`}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {showData?.content?.contentType === "movie" ? (
          <Card className="rounded-lg shadow-sm bg-card border-border">
            <CardHeader>
              <CardTitle>Movie Video Preview</CardTitle>
              <CardDescription>Watch the source media file uploaded for this movie</CardDescription>
            </CardHeader>
            <CardContent>
              {showData?.content?.hlsUrl || showData?.content?.videoUrl ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-border flex items-center justify-center">
                  <PreviewVideo
                    src={getImageUrl(showData.content.hlsUrl || showData.content.videoUrl)}
                    className="w-full h-full object-contain max-h-[500px]"
                  />
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  No preview video uploaded for this movie.
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
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
                          <PreviewVideo
                            src={getImageUrl(previewEpisode.hlsUrl)}
                            className="w-full rounded-lg"
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
