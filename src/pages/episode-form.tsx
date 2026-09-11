import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X, Loader2, Plus, Trash2, ImageIcon, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useGetContentList, useGetSeasonList,
  useGetEpisodeById, useCreateEpisode, useUpdateEpisode,
  useGetLanguagesList, getImageUrl, useEpisodeProcessingStatus
} from "@/lib/api-client";
import MediaPicker from "@/components/MediaPicker";

type Tab = "Episode Details" | "Basic Info" | "Subtitle Info";
const TABS: Tab[] = ["Episode Details", "Basic Info", "Subtitle Info"];

type QualityRow = { id: string; type: string; quality: string; filePath: string; url: string };
type SubtitleRow = { id: string; language: string; filePath: string };

const secsToDuration = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
};

const durationToSecs = (d: string): number => {
  if (!d) return 0;
  const parts = d.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(d) || 0;
};

const getId = (item: any): string =>
  typeof item === "string" ? item : (item?._id || item?.id || "");

function ImageBox({ label, preview, onOpen }: { label: string; preview: string; onOpen: () => void }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div
        onClick={onOpen}
        className="border-2 border-dashed border-border rounded-xl aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden"
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export default function EpisodeForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [activeTab, setActiveTab] = useState<Tab>("Episode Details");

  // Media pickers
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [qualityPickerOpen, setQualityPickerOpen] = useState(false);
  const [currentQualityRowId, setCurrentQualityRowId] = useState<string | null>(null);
  const [subtitlePickerOpen, setSubtitlePickerOpen] = useState(false);
  const [currentSubtitleRowId, setCurrentSubtitleRowId] = useState<string | null>(null);

  // Episode Details
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [showId, setShowId] = useState("");
  const [seasonNumber, setSeasonNumber] = useState("1");
  const [episodeNumber, setEpisodeNumber] = useState("1");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [coinsRequired, setCoinsRequired] = useState("0");
  const [videoUploadType, setVideoUploadType] = useState("url");
  const [videoFilePath, setVideoFilePath] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [duration, setDuration] = useState("");

  // Quality rows
  const [qualityEnabled, setQualityEnabled] = useState(false);
  const [qualityRows, setQualityRows] = useState<QualityRow[]>([
    { id: "1", type: "url", quality: "480p", filePath: "", url: "" },
  ]);

  // Basic Info
  const [airDate, setAirDate] = useState("");
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [selectedAudioLanguages, setSelectedAudioLanguages] = useState<string[]>([]);

  // Subtitle Info
  const [selectedSubtitleLanguages, setSelectedSubtitleLanguages] = useState<string[]>([]);
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([]);

  const isShortDramaRoute = location.includes("short-drama");

  // API
  const { data: showsData, isLoading: loadingShows } = useGetContentList({ contentType: isShortDramaRoute ? "drama" : "series", limit: 200 });
  const { data: seasonsData } = useGetSeasonList(showId ? { contentId: showId } : {});
  const { data: existingEpisode, isLoading: loadingEpisode } = useGetEpisodeById(isEdit ? id : "");
  const { data: processingData } = useEpisodeProcessingStatus(isEdit ? id! : "", isEdit);
  const { data: languagesData } = useGetLanguagesList();
  const languagesList = (languagesData as any)?.data || [];
  const createMutation = useCreateEpisode();
  const updateMutation = useUpdateEpisode();

  const tvShows: any[] = showsData?.data || [];
  const availableSeasons: any[] = seasonsData?.data || [];

  const handleVideoSelect = (media: any) => {
    setVideoFilePath(media.filePath);
    setVideoPickerOpen(false);

    // Auto-fill title if empty
    if (!name && media.name) {
      const titleWithoutExt = media.name.replace(/\.[^/.]+$/, "");
      setName(titleWithoutExt);
    }

    // If media has HLS transcoded
    if (media.isHls && media.hlsMasterPlaylistUrl) {
      setVideoUploadType("hls");
      setVideoUrl(media.hlsMasterPlaylistUrl);
      
      // Auto-set duration from media if available
      if (media.duration) {
        // 3:30-minute limit check for short dramas
        const selectedShow = tvShows.find((s) => getId(s) === showId);
        const isShortDrama = selectedShow?.contentType === "drama";
        
        if (isShortDrama && media.duration > 210) {
          toast({ title: "Short Drama videos cannot exceed 3 minutes 30 seconds.", variant: "destructive" });
          setVideoFilePath(""); // Clear selection
          return;
        }
        
        setDuration(secsToDuration(media.duration));
      }
      
      // Auto-fill quality rows from hlsQualities
      if (Array.isArray(media.hlsQualities) && media.hlsQualities.length > 0) {
        setQualityEnabled(true);
        setQualityRows(
          media.hlsQualities.map((q: any, i: number) => {
            const isUrl = q.url && (q.url.startsWith("http://") || q.url.startsWith("https://"));
            return {
              id: String(i + 1),
              type: isUrl ? "url" : "local",
              quality: q.quality || "480p",
              filePath: isUrl ? "" : (q.filePath || ""),
              url: isUrl ? q.url : "",
            };
          })
        );
      }
    } else {
      // Fall back to original local/url
      setVideoUploadType("local");
      
      // Auto-calculate duration if not available from media
      if (media.duration) {
        // 3:30-minute limit check for short dramas
        const selectedShow = tvShows.find((s) => getId(s) === showId);
        const isShortDrama = selectedShow?.contentType === "drama";
        
        if (isShortDrama && media.duration > 210) {
          toast({ title: "Short Drama videos cannot exceed 3 minutes 30 seconds.", variant: "destructive" });
          setVideoFilePath(""); // Clear selection
          return;
        }
        
        setDuration(secsToDuration(media.duration));
      } else {
        const videoUrl = media.url || media.filePath;
        if (videoUrl) {
          const video = document.createElement("video");
          video.src = getImageUrl(videoUrl);
          video.onloadedmetadata = () => {
            const durationSecs = Math.round(video.duration);
            
            // 3:30-minute limit check for short dramas
            const selectedShow = tvShows.find((s) => getId(s) === showId);
            const isShortDrama = selectedShow?.contentType === "drama";
            
            if (isShortDrama && durationSecs > 210) {
              toast({ title: "Short Drama videos cannot exceed 3 minutes 30 seconds.", variant: "destructive" });
              setVideoFilePath(""); // Clear selection
              return;
            }

            setDuration(secsToDuration(durationSecs));
          };
          video.onerror = () => console.warn("Could not load video metadata for duration calculation");
        }
      }
    }
  };

  useEffect(() => {
    if (isEdit && existingEpisode) {
      const e = existingEpisode;
      setShowId(e.contentId?._id || e.contentId || "");
      setSeasonNumber(String(e.season || 1));
      setEpisodeNumber(String(e.episode || 1));
      setName(e.title || "");
      setDescription(e.description || "");
      setThumbnailUrl(e.thumbnail || "");
      setTrailerUrl(e.trailerUrl || "");
      setIsFree(e.isFree || false);
      setIsLocked(e.isLocked !== false);
      setCoinsRequired(String(e.coinsRequired || 0));
      setAirDate(e.airDate ? new Date(e.airDate).toISOString().split("T")[0] : "");
      setDownloadAllowed(e.downloadAllowed || false);
      setDuration(e.duration ? secsToDuration(e.duration) : "");

      if (Array.isArray(e.audioLanguages)) {
        setSelectedAudioLanguages(e.audioLanguages.map(getId).filter(Boolean));
      }
      if (Array.isArray(e.subtitleLanguages)) {
        setSelectedSubtitleLanguages(e.subtitleLanguages.map(getId).filter(Boolean));
      }
      if (Array.isArray(e.subtitles) && e.subtitles.length > 0) {
        setSubtitleRows(
          e.subtitles.map((s: any, i: number) => ({
            id: String(i),
            language: getId(s.language),
            filePath: s.filePath || "",
          }))
        );
      }

       if (e.hlsUrl) {
         const isHttp = e.hlsUrl.startsWith("http://") || e.hlsUrl.startsWith("https://");
         if (e.hlsUrl.endsWith(".m3u8") && isHttp) {
           setVideoUploadType("hls");
           setVideoUrl(e.hlsUrl);
         } else {
           setVideoUploadType("local");
           setVideoFilePath(e.hlsUrl);
         }
       } else if (e.sourceVideoUrl) {
        setVideoUploadType("url");
        setVideoUrl(e.sourceVideoUrl);
      }

      if (Array.isArray(e.videoQualities) && e.videoQualities.length > 0) {
        setQualityEnabled(true);
        setQualityRows(
          e.videoQualities.map((q: any, i: number) => {
            const isUrl = q.url && (q.url.startsWith("http://") || q.url.startsWith("https://"));
            return {
              id: String(i + 1),
              type: isUrl ? "url" : "local",
              quality: q.quality || "480p",
              filePath: isUrl ? "" : (q.url || ""),
              url: isUrl ? q.url : "",
            };
          })
        );
      }
    }
  }, [isEdit, existingEpisode]);

  const addQualityRow = () =>
    setQualityRows((p) => [...p, { id: Date.now().toString(), type: "url", quality: "480p", filePath: "", url: "" }]);
  const removeQualityRow = (rowId: string) =>
    setQualityRows((p) => p.filter((r) => r.id !== rowId));
  const updateQualityRow = (rowId: string, key: keyof QualityRow, value: string) =>
    setQualityRows((p) => p.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)));

  const handleSave = async () => {
    if (!showId) {
      toast({ title: "Please select a TV Show", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Episode title is required", variant: "destructive" });
      return;
    }

    const payload: any = {
      contentId: showId,
      season: parseInt(seasonNumber) || 1,
      episode: parseInt(episodeNumber) || 1,
      title: name,
      description: description || undefined,
      thumbnail: thumbnailUrl || undefined,
      sourceVideoUrl: videoUploadType === "url" ? videoUrl : undefined,
      hlsUrl: videoUploadType === "local" ? videoFilePath : (videoUploadType === "hls" ? videoUrl : undefined),
      trailerUrl: trailerUrl || undefined,
      isFree,
      isLocked: !isFree && isLocked,
      coinsRequired: parseInt(coinsRequired) || 0,
      airDate: airDate ? new Date(airDate) : undefined,
      downloadAllowed,
      audioLanguages: selectedAudioLanguages,
      subtitleLanguages: selectedSubtitleLanguages,
      subtitles: subtitleRows
        .filter((r) => r.filePath && r.language)
        .map((r) => ({ language: r.language, filePath: r.filePath })),
      duration: duration ? durationToSecs(duration) : undefined,
      videoQualities: qualityEnabled
        ? qualityRows
            .filter((q) => q.url || q.filePath)
            .map((q) => ({
              quality: q.quality as any,
              url: q.type === "local" ? q.filePath : q.url,
              size: 0,
            }))
        : [],
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      queryClient.invalidateQueries({ queryKey: ["season-list"] });
      toast({ title: isEdit ? "Episode updated!" : "Episode created!" });
      setLocation("/episodes");
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message, variant: "destructive" });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingEpisode) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const MultiSelect = ({
    label, required = false, items, selected, onAdd, onRemove, placeholder,
  }: {
    label: string; required?: boolean;
    items: any[]; selected: string[];
    onAdd: (id: string) => void; onRemove: (id: string) => void;
    placeholder?: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-foreground text-sm font-medium">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      <div className="space-y-2">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((itemId) => {
              const item = items.find((i: any) => getId(i) === itemId);
              return (
                <div key={itemId} className="flex items-center gap-1 bg-muted border border-border rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-foreground">{item?.name || itemId}</span>
                  <button type="button" onClick={() => onRemove(itemId)} className="text-muted-foreground hover:text-primary">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <Select value="" onValueChange={(v) => { if (v && !selected.includes(v)) onAdd(v); }}>
          <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground max-h-60">
            {items
              .filter((i: any) => !selected.includes(getId(i)))
              .map((item: any) => (
                <SelectItem key={getId(item)} value={getId(item)}>
                  {item.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setLocation("/dashboard")} className="hover:text-foreground transition-colors">Dashboard</button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Episode" : "New Episode"}</span>
      </div>

      <button onClick={() => setLocation("/episodes")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
        «&nbsp;Back
      </button>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
              activeTab === tab
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">

        {/* ===== EPISODE DETAILS TAB ===== */}
        {activeTab === "Episode Details" && (
          <div className="p-6 space-y-6">
            <p className="text-base font-semibold text-foreground">Episode Details</p>

            {/* Thumbnail */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <ImageBox label="Episode Thumbnail" preview={thumbnailUrl ? getImageUrl(thumbnailUrl) : ""} onOpen={() => setThumbnailPickerOpen(true)} />
            </div>

            <MediaPicker
              open={thumbnailPickerOpen}
              onClose={() => setThumbnailPickerOpen(false)}
              onSelect={(media) => { setThumbnailUrl(media.filePath || media.url); setThumbnailPickerOpen(false); }}
              source="tv-show"
              accept="image/*"
            />

            {/* Show, Season, Episode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">
                  TV Show <span className="text-primary">*</span>
                </Label>
                <Select value={showId} onValueChange={setShowId} disabled={loadingShows}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                    <SelectValue placeholder={loadingShows ? "Loading…" : "Select TV Show"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    {tvShows.length === 0
                      ? <SelectItem value="_none" disabled>No TV shows found</SelectItem>
                      : tvShows.map((s) => <SelectItem key={s._id} value={s._id}>{s.title}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">
                  Season <span className="text-primary">*</span>
                </Label>
                <Select value={seasonNumber} onValueChange={setSeasonNumber}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    {availableSeasons.length > 0
                      ? availableSeasons.map((s: any) => (
                          <SelectItem key={s.seasonId} value={String(s.season)}>Season {s.season}</SelectItem>
                        ))
                      : [1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>Season {n}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">
                  Episode Number <span className="text-primary">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(e.target.value)}
                  className="bg-muted border-border text-foreground h-10 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm font-medium">
                Episode Title <span className="text-primary">*</span>
              </Label>
              <Input
                placeholder="e.g. The Beginning"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-sm font-medium">Description</Label>
                <button className="text-xs text-primary hover:text-red-300 flex items-center gap-1.5 transition-colors">
                  <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </button>
              </div>
              <Textarea
                placeholder="Episode description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-lg text-sm resize-none"
              />
            </div>

            {isEdit && processingData?.data && (
              <div className="rounded-xl border border-border bg-muted/10 p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Upload:</span> Complete</p>
                <p><span className="text-muted-foreground">Transcoding:</span> {processingData.data.processingStatus === "processing" ? "In progress" : processingData.data.processingStatus === "ready" ? "Complete" : processingData.data.processingStatus}</p>
                <p><span className="text-muted-foreground">CDN:</span> {processingData.data.hlsUrl ? "Available" : "Waiting"}</p>
                <p><span className="text-muted-foreground">Playback:</span> {processingData.data.playbackReady ? "Ready" : "Not ready"}</p>
                {processingData.data.processingError && (
                  <p className="text-destructive">{processingData.data.processingError}</p>
                )}
              </div>
            )}

            {/* Video Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Video Upload Type</Label>
                <Select value={videoUploadType} onValueChange={setVideoUploadType}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="url">External URL</SelectItem>
                    <SelectItem value="hls">HLS / M3U8 URL</SelectItem>
                    <SelectItem value="local">Local (Media Library)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Video</Label>
                {videoUploadType === "local" ? (
                  <div onClick={() => setVideoPickerOpen(true)}
                    className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden w-full">
                    {videoFilePath ? (
                      <span className="text-sm text-foreground truncate px-3 w-full text-center block" title={getImageUrl(videoFilePath)}>
                        {getImageUrl(videoFilePath)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Click to select from media library</span>
                    )}
                  </div>
                ) : (
                  <Input
                    placeholder={videoUploadType === "hls" ? "https://cdn.example.com/video.m3u8" : "https://..."}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                  />
                )}
              </div>
            </div>

            {/* Trailer URL */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm font-medium">Trailer URL</Label>
              <Input
                placeholder="https://..."
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
              />
            </div>

            {/* Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-sm font-medium text-foreground">Free Episode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Watchable without subscription</p>
                </div>
                <Switch checked={isFree} onCheckedChange={(v) => { setIsFree(v); if (v) setIsLocked(false); }} className="data-[state=checked]:bg-primary" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-sm font-medium text-foreground">Locked</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Requires subscription to unlock</p>
                </div>
                <Switch checked={isLocked && !isFree} onCheckedChange={setIsLocked} disabled={isFree} className="data-[state=checked]:bg-primary" />
              </div>
              <div className={`col-span-full rounded-xl border-2 p-4 transition-colors ${isFree ? 'border-border/40 opacity-50' : 'border-yellow-500/40 bg-yellow-500/5'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      🪙 Coins Required to Unlock
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Set the coin price for this episode.
                      {isFree
                        ? " Disabled because this episode is marked as Free."
                        : " Users with an active subscription unlock this for free. Others must spend coins."}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      value={coinsRequired}
                      onChange={(e) => setCoinsRequired(e.target.value)}
                      disabled={isFree}
                      className="bg-muted border-yellow-500/30 focus:border-yellow-400 w-28 text-foreground h-10 rounded-lg text-sm text-right font-semibold"
                      placeholder="0"
                    />
                    <span className="text-xs text-muted-foreground">0 = free with subscription only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== BASIC INFO TAB ===== */}
        {activeTab === "Basic Info" && (
          <div className="p-6 space-y-6">
            <p className="text-base font-semibold text-foreground">Basic Info</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Air Date</Label>
                <Input
                  type="date"
                  value={airDate}
                  onChange={(e) => setAirDate(e.target.value)}
                  className="bg-muted border-border text-foreground h-10 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Duration</Label>
                <Input type="time" step="1" value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="bg-muted border-border text-foreground h-10 rounded-lg text-sm" />
                <p className="text-xs text-muted-foreground">Format: HH:MM:SS</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <MultiSelect
                label="Audio Languages"
                items={languagesList}
                selected={selectedAudioLanguages}
                onAdd={(v) => setSelectedAudioLanguages((p) => [...p, v])}
                onRemove={(v) => setSelectedAudioLanguages((p) => p.filter((x) => x !== v))}
              />
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-sm font-medium text-foreground">Allow Download</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Users can download this episode</p>
                </div>
                <Switch checked={downloadAllowed} onCheckedChange={setDownloadAllowed} className="data-[state=checked]:bg-primary" />
              </div>
            </div>

            {/* Quality Variants */}
            <p className="text-sm font-semibold text-foreground">Quality Variants</p>
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">Enable quality-specific video files</p>
                <Switch checked={qualityEnabled} onCheckedChange={setQualityEnabled} className="data-[state=checked]:bg-primary" />
              </div>
              {qualityEnabled && (
                <div className="space-y-4">
                  {qualityRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="space-y-1.5">
                        <Label className="text-foreground text-sm font-medium">Upload Type</Label>
                        <Select value={row.type} onValueChange={(v) => updateQualityRow(row.id, "type", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                            <SelectItem value="url">External URL</SelectItem>
                            <SelectItem value="local">Local</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-foreground text-sm font-medium">Quality</Label>
                        <Select value={row.quality} onValueChange={(v) => updateQualityRow(row.id, "quality", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                            {["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p"].map((q) => (
                              <SelectItem key={q} value={q}>{q}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-foreground text-sm font-medium">File</Label>
                          {row.type === "local" ? (
                            <div onClick={() => { setCurrentQualityRowId(row.id); setQualityPickerOpen(true); }}
                              className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden px-3 text-sm text-foreground truncate min-w-0 w-full animate-none">
                              {row.filePath || "Select file..."}
                            </div>
                          ) : (
                            <Input placeholder="https://..." value={row.url} onChange={(e) => updateQualityRow(row.id, "url", e.target.value)}
                              className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                          )}
                        </div>
                        <button type="button" onClick={() => removeQualityRow(row.id)}
                          className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-start">
                    <Button type="button" onClick={addQualityRow}
                      className="bg-primary hover:bg-primary/90 text-white h-9 gap-2 rounded-lg px-4 text-sm font-semibold">
                      <Plus className="h-4 w-4" /> Add Quality
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SUBTITLE INFO TAB ===== */}
        {activeTab === "Subtitle Info" && (
          <div className="p-6 space-y-5">
            <p className="text-base font-semibold text-foreground">Subtitle Languages</p>
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <MultiSelect
                label="Subtitle Languages"
                items={languagesList}
                selected={selectedSubtitleLanguages}
                onAdd={(v) => setSelectedSubtitleLanguages((p) => [...p, v])}
                onRemove={(v) => setSelectedSubtitleLanguages((p) => p.filter((x) => x !== v))}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Select the subtitle languages available for this episode.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">Subtitle Files</p>
              <Button type="button"
                onClick={() => setSubtitleRows((p) => [...p, { id: Date.now().toString(), language: "", filePath: "" }])}
                className="bg-primary hover:bg-primary/90 text-white h-9 gap-2 rounded-lg px-4 text-sm font-semibold">
                <Plus className="h-4 w-4" /> Add Subtitle
              </Button>
            </div>

            {subtitleRows.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/10 py-12 flex flex-col items-center gap-3">
                <UploadIcon className="h-9 w-9 text-muted-foreground/80" />
                <p className="text-sm text-muted-foreground">No subtitle files added. Click "Add Subtitle" to upload .srt or .vtt files.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subtitleRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-border bg-muted/10 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-foreground text-sm font-medium">Language</Label>
                      <Select
                        value={row.language}
                        onValueChange={(v) => setSubtitleRows((p) => p.map((r) => r.id === row.id ? { ...r, language: v } : r))}
                      >
                        <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                          <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground max-h-60">
                          {languagesList.map((lang: any) => (
                            <SelectItem key={getId(lang)} value={getId(lang)}>{lang.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-3 items-end min-w-0">
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <Label className="text-foreground text-sm font-medium">Subtitle File (.srt, .vtt)</Label>
                        <div
                          onClick={() => { setCurrentSubtitleRowId(row.id); setSubtitlePickerOpen(true); }}
                          className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden w-full"
                        >
                          {row.filePath ? (
                            <span className="text-sm text-foreground truncate px-3 w-full text-center block" title={row.filePath}>
                              {row.filePath}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Click to select subtitle file</span>
                          )}
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => setSubtitleRows((p) => p.filter((r) => r.id !== row.id))}
                        className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setLocation("/episodes")} className="border-border">Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold text-sm gap-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? "Update Episode" : "Create Episode"}
        </Button>
      </div>

      {/* Media Pickers */}
      <MediaPicker open={videoPickerOpen} onClose={() => setVideoPickerOpen(false)}
        onSelect={handleVideoSelect} source="tv-show" accept="video/*" />
      <MediaPicker
        open={qualityPickerOpen}
        onClose={() => { setQualityPickerOpen(false); setCurrentQualityRowId(null); }}
        onSelect={(m) => {
          if (currentQualityRowId) updateQualityRow(currentQualityRowId, "filePath", m.filePath);
        }}
        source="tv-show" accept="video/*"
      />
      <MediaPicker
        open={subtitlePickerOpen}
        onClose={() => { setSubtitlePickerOpen(false); setCurrentSubtitleRowId(null); }}
        onSelect={(m) => {
          if (currentSubtitleRowId)
            setSubtitleRows((p) => p.map((r) => r.id === currentSubtitleRowId ? { ...r, filePath: m.filePath } : r));
        }}
        source="tv-show" accept=".srt,.vtt,.ass,.ssa"
      />
    </div>
  );
}
