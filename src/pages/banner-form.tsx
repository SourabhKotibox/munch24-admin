import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Film,
  Tv,
  Clapperboard,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  X,
  Star,
  Clock,
  Upload,
  Link2,
  Image as ImageIcon2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  useGetBannerById,
  useGetBannerShowByContentId,
  useCreateBannerFromContent,
  useUpdateBanner,
  useUpdateEpisodeLock,
  useAppendBannerShowVideo,
  useGetContentList,
  useGetMovies,
  getImageUrl,
} from "../lib/api-client";
import MediaPicker from "@/components/MediaPicker";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type ContentType = "movie" | "tvshow" | "drama";

type ContentItem = {
  id: string;
  title: string;
  thumbnail?: string;
  description?: string;
  shortDescription?: string;
  status?: string;
  year?: number;
  duration?: number;
  contentType?: string;
};

type Episode = {
  id: string;
  episode: number;
  title?: string;
  isLocked: boolean;
  processingStatus?: string;
};

/* ------------------------------------------------------------------ */
/*  Content-type cards config                                           */
/* ------------------------------------------------------------------ */
const CONTENT_TYPES: {
  key: ContentType;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  apiSource: "movie" | "content";
  apiType?: string;
}[] = [
  {
    key: "movie",
    label: "Movie",
    icon: <Film className="w-7 h-7" />,
    description: "Feature films already in your library",
    color: "from-violet-500/20 to-purple-600/10 border-violet-500/40",
    apiSource: "movie",
  },
  {
    key: "tvshow",
    label: "TV Show",
    icon: <Tv className="w-7 h-7" />,
    description: "Web series & episodic TV shows",
    color: "from-sky-500/20 to-blue-600/10 border-sky-500/40",
    apiSource: "content",
    apiType: "series",
  },
  {
    key: "drama",
    label: "Short Drama",
    icon: <Clapperboard className="w-7 h-7" />,
    description: "Short-form dramas & micro-series",
    color: "from-rose-500/20 to-pink-600/10 border-rose-500/40",
    apiSource: "content",
    apiType: "drama",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function BannerForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const isEdit = !!id;

  /* ---- remote data ---- */
  const { data: bannerData } = useGetBannerById(id || "");
  const { data: bannerShowData } = useGetBannerShowByContentId(
    bannerData?.content?.id || "",
    undefined
  );
  const episodes: Episode[] = bannerShowData?.episodes || [];

  /* ---- mutations ---- */
  const createMutation = useCreateBannerFromContent();
  const updateMutation = useUpdateBanner();
  const appendMutation = useAppendBannerShowVideo();
  const lockMutation = useUpdateEpisodeLock();

  /* ---- step state ---- */
  const [step, setStep] = useState<1 | 2 | 3>(isEdit ? 3 : 1);
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  /* ---- publishing state ---- */
  const [publishing, setPublishing] = useState({
    title: "",
    subtitle: "",
    description: "",
    ctaText: "Watch Now",
    ctaLink: "",
    position: 0,
    isActive: true,
  });

  /* ---- append video state ---- */
  const [appendVideoFile, setAppendVideoFile] = useState<File | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState("upload");
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [thumbnailOverride, setThumbnailOverride] = useState("");

  /* ---- load edit data ---- */
  useEffect(() => {
    if (isEdit && bannerData) {
      setPublishing({
        title: bannerData.title || "",
        subtitle: bannerData.subtitle || "",
        description: bannerData.description || "",
        ctaText: bannerData.ctaText || "Watch Now",
        ctaLink: bannerData.ctaLink || "",
        position: bannerData.position ?? 0,
        isActive: bannerData.isActive ?? true,
      });
      setThumbnailOverride(
        bannerData.content?.thumbnail || bannerData.thumbnail || bannerData.imageUrl || ""
      );
    }
  }, [isEdit, bannerData]);

  /* ---- queries for content search ---- */
  const cfg = CONTENT_TYPES.find((c) => c.key === contentType);
  const moviesQuery = useGetMovies(
    cfg?.apiSource === "movie" ? { search: searchQuery, limit: 50 } : undefined
  );
  const contentQuery = useGetContentList(
    cfg?.apiSource === "content"
      ? { search: searchQuery, limit: 50, contentType: cfg?.apiType }
      : undefined
  );

  const contentItems: ContentItem[] = (() => {
    if (!contentType) return [];
    if (cfg?.apiSource === "movie") {
      return (moviesQuery.data?.data || []).map((m: any) => ({
        id: m._id || m.id,
        title: m.title,
        thumbnail: m.thumbnail || m.bannerImage,
        description: m.description,
        shortDescription: m.shortDescription,
        status: m.status,
        year: m.year,
        duration: m.duration,
      }));
    }
    return (contentQuery.data?.data || []).map((c: any) => ({
      id: c._id || c.id,
      title: c.title,
      thumbnail: c.thumbnail || c.bannerImage,
      description: c.description,
      shortDescription: c.shortDescription,
      status: c.status,
      year: c.year,
      contentType: c.contentType,
    }));
  })();

  /* ---- populate publishing when content is selected ---- */
  useEffect(() => {
    if (selectedContent) {
      setPublishing((prev) => ({
        ...prev,
        title: selectedContent.title,
        subtitle: selectedContent.shortDescription || "",
        description: selectedContent.description || "",
      }));
    }
  }, [selectedContent]);

  /* ---- submit create ---- */
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedContent || !cfg) return;
    try {
      await createMutation.mutateAsync({
        contentId: selectedContent.id,
        contentSource: cfg.apiSource,
        ...publishing,
      });
      toast({ title: "Banner created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
      setLocation("/banners");
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      toast({ title: msg, variant: "destructive" });
    }
  };

  /* ---- submit update ---- */
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("title", publishing.title);
      fd.append("subtitle", publishing.subtitle);
      fd.append("description", publishing.description);
      fd.append("ctaText", publishing.ctaText);
      if (publishing.ctaLink) fd.append("ctaLink", publishing.ctaLink);
      fd.append("position", publishing.position.toString());
      fd.append("isActive", publishing.isActive.toString());
      if (thumbnailOverride) fd.append("thumbnail", thumbnailOverride);
      await updateMutation.mutateAsync({ bannerId: id, data: fd });
      toast({ title: "Banner updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
      setLocation("/banners");
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  /* ---- append video ---- */
  const handleAppendVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!bannerData?.content?.id || !appendVideoFile) return;
    try {
      const fd = new FormData();
      fd.append("videoFile", appendVideoFile);
      await appendMutation.mutateAsync({ contentId: bannerData.content.id, data: fd });
      toast({ title: "Episodes added successfully!" });
      setAppendVideoFile(null);
      queryClient.invalidateQueries({ queryKey: ["banner-show", bannerData.content.id] });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  /* ---- lock toggle ---- */
  const handleEpisodeLockToggle = (ep: Episode) => {
    lockMutation.mutate(
      { episodeId: ep.id, isLocked: !ep.isLocked },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banner-show", bannerData?.content?.id] }),
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => setLocation("/banners")}>
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? "Edit Banner" : "Create Banner"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit
              ? "Update banner details and publishing settings"
              : "Select existing content and configure the banner"}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* EDIT MODE                                                     */}
      {/* ============================================================ */}
      {isEdit && (
        <>
          {/* Linked content preview */}
          {bannerData?.content && (
            <Card className="mb-6 rounded-xl overflow-hidden border-border/60">
              <div className="flex gap-4 p-5 items-center bg-muted/30">
                <img
                  src={getImageUrl(bannerData.content.thumbnail || bannerData.thumbnail || bannerData.imageUrl || "")}
                  alt={bannerData.title}
                  className="w-20 h-28 object-cover rounded-lg border border-border flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="mb-1 text-xs">
                    Linked Content
                  </Badge>
                  <h3 className="font-semibold text-lg truncate">{bannerData.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {bannerData.description}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Edit form */}
          <form onSubmit={handleUpdate} className="space-y-6">
            <PublishingCard
              publishing={publishing}
              setPublishing={setPublishing}
              showThumbnail
              thumbnailOverride={thumbnailOverride}
              setThumbnailOverride={setThumbnailOverride}
              thumbnailMode={thumbnailMode}
              setThumbnailMode={setThumbnailMode}
              thumbnailPickerOpen={thumbnailPickerOpen}
              setThumbnailPickerOpen={setThumbnailPickerOpen}
            />
            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="ghost" onClick={() => setLocation("/banners")}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Update Banner"}
              </Button>
            </div>
          </form>

          {/* Episodes section */}
          {bannerData?.content && (
            <div className="mt-12">
              <h2 className="text-xl font-bold mb-5">Episodes</h2>
              <form onSubmit={handleAppendVideo} className="mb-6 p-4 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="appendVideo">Append More Episodes</Label>
                  <Input id="appendVideo" type="file" accept="video/*" onChange={(e) => setAppendVideoFile(e.target.files?.[0] || null)} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={!appendVideoFile || appendMutation.isPending} className="w-full sm:w-auto">
                    Append Episodes
                  </Button>
                </div>
              </form>
              {episodes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {episodes.map((ep) => (
                    <div key={ep.id} className="p-4 border border-border rounded-lg bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">Ep {ep.episode}</span>
                        <Button variant="ghost" size="icon" type="button" className="h-7 w-7" disabled={lockMutation.isPending} onClick={() => handleEpisodeLockToggle(ep)}>
                          {ep.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${ep.processingStatus === "ready" ? "bg-green-500/15 text-green-500" : ep.processingStatus === "failed" ? "bg-destructive/15 text-destructive" : "bg-yellow-500/15 text-yellow-600"}`}>
                        {ep.processingStatus}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10">No episodes yet.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* CREATE MODE — STEP WIZARD                                     */}
      {/* ============================================================ */}
      {!isEdit && (
        <>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {(["Choose Type", "Select Content", "Publishing"] as const).map((label, i) => {
              const stepNum = (i + 1) as 1 | 2 | 3;
              const done = step > stepNum;
              const active = step === stepNum;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 text-center">{stepNum}</span>}
                    {label}
                  </div>
                  {i < 2 && <div className="w-8 h-px bg-border" />}
                </div>
              );
            })}
          </div>

          {/* ===== STEP 1: Choose Content Type ===== */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                What kind of content do you want to feature in this banner?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.key}
                    type="button"
                    onClick={() => { setContentType(ct.key); setSelectedContent(null); setSearchQuery(""); setStep(2); }}
                    className={`group text-left p-5 rounded-xl border bg-gradient-to-br transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${ct.color} ${contentType === ct.key ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="text-primary mb-3">{ct.icon}</div>
                    <div className="font-semibold text-base mb-1">{ct.label}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{ct.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== STEP 2: Select Content ===== */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    {cfg?.icon}
                    Select a {cfg?.label}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Pick from your existing {cfg?.label.toLowerCase()} library
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setStep(1); setContentType(null); }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Change Type
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${cfg?.label.toLowerCase()}s…`}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Content grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {(contentItems.length === 0) && (
                  <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                    {moviesQuery.isLoading || contentQuery.isLoading
                      ? "Loading…"
                      : "No content found. Try a different search."}
                  </div>
                )}
                {contentItems.map((item) => {
                  const isSelected = selectedContent?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedContent(item)}
                      className={`group relative text-left rounded-xl border overflow-hidden transition-all duration-150 hover:border-primary/60 hover:shadow-md ${isSelected ? "ring-2 ring-primary border-primary" : "border-border"}`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
                        {item.thumbnail ? (
                          <img
                            src={getImageUrl(item.thumbnail)}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-8 h-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-foreground drop-shadow" />
                          </div>
                        )}
                        {item.status && (
                          <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${item.status === "published" ? "bg-green-500/90 text-white" : "bg-amber-500/90 text-white"}`}>
                            {item.status}
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold truncate leading-tight">{item.title}</p>
                        {item.year && <p className="text-[10px] text-muted-foreground mt-0.5">{item.year}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected preview strip */}
              {selectedContent && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/40 bg-primary/5">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">
                    Selected: <span className="text-primary">{selectedContent.title}</span>
                  </span>
                  <Button size="sm" onClick={() => setStep(3)}>
                    Next: Publishing →
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 3: Publishing Settings ===== */}
          {step === 3 && (
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Selected content preview */}
              {selectedContent && (
                <Card className="rounded-xl overflow-hidden">
                  <div className="flex gap-4 p-4 items-start bg-muted/20">
                    {selectedContent.thumbnail && (
                      <img
                        src={getImageUrl(selectedContent.thumbnail)}
                        alt={selectedContent.title}
                        className="w-16 h-24 object-cover rounded-lg border border-border flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <Badge className="mb-1 text-xs bg-primary/15 text-primary border-0 hover:bg-primary/20">
                        {cfg?.label}
                      </Badge>
                      <h3 className="font-semibold text-base truncate">{selectedContent.title}</h3>
                      {selectedContent.shortDescription && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selectedContent.shortDescription}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => { setSelectedContent(null); setStep(2); }}
                    >
                      <X className="w-4 h-4 mr-1" /> Change
                    </Button>
                  </div>
                </Card>
              )}

              <PublishingCard
                publishing={publishing}
                setPublishing={setPublishing}
                showThumbnail={false}
                thumbnailOverride={thumbnailOverride}
                setThumbnailOverride={setThumbnailOverride}
                thumbnailMode={thumbnailMode}
                setThumbnailMode={setThumbnailMode}
                thumbnailPickerOpen={thumbnailPickerOpen}
                setThumbnailPickerOpen={setThumbnailPickerOpen}
              />

              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setLocation("/banners")}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || !selectedContent}>
                    {createMutation.isPending ? "Creating…" : "Create Banner"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </>
      )}

      {/* Media picker for thumbnail override in edit mode */}
      <MediaPicker
        open={thumbnailPickerOpen}
        onClose={() => setThumbnailPickerOpen(false)}
        onSelect={(media) => setThumbnailOverride(media.url)}
        source="banner"
        accept="image/*"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Publishing card sub-component                                       */
/* ------------------------------------------------------------------ */
type PublishingCardProps = {
  publishing: {
    title: string;
    subtitle: string;
    description: string;
    ctaText: string;
    ctaLink: string;
    position: number;
    isActive: boolean;
  };
  setPublishing: React.Dispatch<React.SetStateAction<PublishingCardProps["publishing"]>>;
  showThumbnail: boolean;
  thumbnailOverride: string;
  setThumbnailOverride: (v: string) => void;
  thumbnailMode: string;
  setThumbnailMode: (v: string) => void;
  thumbnailPickerOpen: boolean;
  setThumbnailPickerOpen: (v: boolean) => void;
};

function PublishingCard({
  publishing,
  setPublishing,
  showThumbnail,
  thumbnailOverride,
  setThumbnailOverride,
  thumbnailMode,
  setThumbnailMode,
  thumbnailPickerOpen,
  setThumbnailPickerOpen,
}: PublishingCardProps) {
  const set = useCallback(
    (key: keyof typeof publishing, value: any) =>
      setPublishing((prev) => ({ ...prev, [key]: value })),
    [setPublishing]
  );

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Banner Details</CardTitle>
          <CardDescription>Customize how this banner appears in the app.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pub-title">Title *</Label>
              <Input
                id="pub-title"
                value={publishing.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Banner title"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pub-subtitle">Subtitle</Label>
              <Input
                id="pub-subtitle"
                value={publishing.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                placeholder="Short tagline"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pub-description">Description</Label>
            <Textarea
              id="pub-description"
              value={publishing.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Brief description shown on the banner"
            />
          </div>
        </CardContent>
      </Card>

      {/* Thumbnail override (edit mode only) */}
      {showThumbnail && (
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thumbnail Override</CardTitle>
            <CardDescription>Optionally replace the banner image. Leave blank to keep current.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={thumbnailMode} onValueChange={setThumbnailMode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url"><Link2 className="w-4 h-4 mr-2" />URL</TabsTrigger>
                <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-2" />Library</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-4 space-y-3">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={thumbnailOverride}
                  onChange={(e) => setThumbnailOverride(e.target.value)}
                />
                {thumbnailOverride && (
                  <img src={getImageUrl(thumbnailOverride)} alt="Preview" className="h-40 w-28 rounded-lg object-cover border border-border" />
                )}
              </TabsContent>
              <TabsContent value="upload" className="mt-4 space-y-3">
                <Button type="button" variant="outline" className="w-full" onClick={() => setThumbnailPickerOpen(true)}>
                  <ImageIcon2 className="w-4 h-4 mr-2" /> Select from Media Library
                </Button>
                {thumbnailOverride && (
                  <div className="flex items-center gap-3">
                    <img src={getImageUrl(thumbnailOverride)} alt="Preview" className="h-40 w-28 rounded-lg object-cover border border-border" />
                    <Button variant="ghost" size="icon" type="button" onClick={() => setThumbnailOverride("")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* CTA + position + active */}
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Publishing Settings</CardTitle>
          <CardDescription>Control placement, CTA button, and visibility.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pub-cta-text">CTA Button Text</Label>
              <Input
                id="pub-cta-text"
                value={publishing.ctaText}
                onChange={(e) => set("ctaText", e.target.value)}
                placeholder="Watch Now"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pub-cta-link">CTA Link (optional)</Label>
              <Input
                id="pub-cta-link"
                value={publishing.ctaLink}
                onChange={(e) => set("ctaLink", e.target.value)}
                placeholder="/watch/movie-slug"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pub-position">Display Position</Label>
              <Input
                id="pub-position"
                type="number"
                min={0}
                value={publishing.position}
                onChange={(e) => set("position", parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3 mt-auto">
              <div>
                <Label htmlFor="pub-active" className="cursor-pointer">Active</Label>
                <p className="text-xs text-muted-foreground">Show in the app</p>
              </div>
              <Switch
                id="pub-active"
                checked={publishing.isActive}
                onCheckedChange={(v) => set("isActive", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
