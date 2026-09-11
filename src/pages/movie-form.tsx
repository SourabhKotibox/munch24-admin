import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ImageIcon, Plus, X, Trash2, Sparkles, Upload as UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import MediaPicker from "@/components/MediaPicker";
import {
  useGetDirectors, useGetActors, useCreateMovie, useUpdateMovie,
  useGetGenres, useGetLanguagesList, useGetMovieById, useGetCategoriesList,
  useGetSections, getImageUrl, useGetCountries, useMovieProcessingStatus,
} from "@/lib/api-client";

type Tab = "Movie Details" | "Basic Info" | "Quality Info" | "Subtitle Info" | "SEO Settings";

const TABS: Tab[] = ["Movie Details", "Basic Info", "Quality Info", "Subtitle Info", "SEO Settings"];

type QualityRow = { id: string; type: string; quality: string; filePath: string; url: string };
type SubtitleRow = { id: string; language: string; filePath: string };
type CastItem = { id: string; actorId: string; character: string; role: string };
type CrewItem = { id: string; directorId: string; role: string };

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

export default function MovieForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [activeTab, setActiveTab] = useState<Tab>("Movie Details");

  /* ---- Media picker states ---- */
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [posterPickerOpen, setPosterPickerOpen] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [trailerPickerOpen, setTrailerPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [qualityPickerOpen, setQualityPickerOpen] = useState(false);
  const [currentQualityRowId, setCurrentQualityRowId] = useState<string | null>(null);
  const [subtitlePickerOpen, setSubtitlePickerOpen] = useState(false);
  const [currentSubtitleRowId, setCurrentSubtitleRowId] = useState<string | null>(null);
  const [seoImagePickerOpen, setSeoImagePickerOpen] = useState(false);

  /* ---- API data ---- */
  const { data: directorsData } = useGetDirectors({ page: 1, limit: 200 });
  const directorsList = (directorsData as any)?.data || [];
  const { data: actorsData } = useGetActors({ page: 1, limit: 200 });
  const actorsList = (actorsData as any)?.data || [];
  const { data: genresData } = useGetGenres({ page: 1, limit: 100, admin: true });
  const genresList = (genresData as any)?.data || [];
  const { data: languagesData } = useGetLanguagesList();
  const languagesList = (languagesData as any)?.data || [];
  const { data: categoriesData } = useGetCategoriesList({ limit: 100 });
  const categoriesList = (categoriesData as any)?.data || [];
  const { data: sectionsData } = useGetSections({ contentType: "movie", activeOnly: true });
  const sectionOptions = sectionsData?.data?.map((s: any) => ({ id: s.id || s._id, title: s.title })) || [];
  const { data: countriesData } = useGetCountries({ limit: 100 });
  const countries = countriesData?.data || [];

  const createMovieMutation = useCreateMovie();
  const updateMovieMutation = useUpdateMovie();

  const { data: movieData } = useGetMovieById(isEdit ? id! : "");
  const movie = (movieData as any)?.data;
  const { data: processingData } = useMovieProcessingStatus(isEdit ? id! : "", isEdit);

  /* ---- Movie Details ---- */
  const [thumbnail, setThumbnail] = useState({ filePath: "", preview: "" });
  const [poster, setPoster] = useState({ filePath: "", preview: "" });
  const [banner, setBanner] = useState({ filePath: "", preview: "" });
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [trailerUrlType, setTrailerUrlType] = useState("url");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [trailerFilePath, setTrailerFilePath] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [planRequired, setPlanRequired] = useState<"free" | "basic" | "standard" | "premium">("free");
  const [status, setStatus] = useState<"published" | "draft" | "processing" | "moderation" | "rejected">("draft");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  /* ---- Basic Info ---- */
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedAudioLanguages, setSelectedAudioLanguages] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("");
  const [imdbRating, setImdbRating] = useState("");
  const [duration, setDuration] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [country, setCountry] = useState("");
  const [producer, setProducer] = useState("");
  const [studio, setStudio] = useState("");
  const [ageRating, setAgeRating] = useState("0");
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [isNewContent, setIsNewContent] = useState(true);
  const [isExclusive, setIsExclusive] = useState(false);
  const [maturityContent, setMaturityContent] = useState<string[]>([]);
  const [maturityInput, setMaturityInput] = useState("");
  const [castItems, setCastItems] = useState<CastItem[]>([]);
  const [crewItems, setCrewItems] = useState<CrewItem[]>([]);

  /* ---- Quality Info ---- */
  const [videoUploadType, setVideoUploadType] = useState("url");
  const [videoFilePath, setVideoFilePath] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [qualityEnabled, setQualityEnabled] = useState(false);
  const [qualityRows, setQualityRows] = useState<QualityRow[]>([
    { id: "1", type: "url", quality: "480p", filePath: "", url: "" },
  ]);

  /* ---- Subtitle Info ---- */
  const [selectedSubtitleLanguages, setSelectedSubtitleLanguages] = useState<string[]>([]);
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([]);

  /* ---- SEO Settings ---- */
  const [seoImage, setSeoImage] = useState({ filePath: "", preview: "" });
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const handleVideoSelect = (media: any) => {
    setVideoFilePath(media.filePath);
    setVideoPickerOpen(false);

    // Auto-fill title if empty
    if (!title && media.name) {
      const titleWithoutExt = media.name.replace(/\.[^/.]+$/, "");
      setTitle(titleWithoutExt);
    }

    // If media has HLS transcoded
    if (media.isHls && media.hlsMasterPlaylistUrl) {
      setVideoUploadType("hls");
      setVideoUrl(media.hlsMasterPlaylistUrl);
      
      // Auto-set duration from media if available
      if (media.duration) {
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
        setDuration(secsToDuration(media.duration));
      } else {
        const videoUrl = media.url || media.filePath;
        if (videoUrl) {
          const video = document.createElement("video");
          video.src = getImageUrl(videoUrl);
          video.onloadedmetadata = () => {
            const durationSecs = Math.round(video.duration);
            setDuration(secsToDuration(durationSecs));
          };
          video.onerror = () => console.warn("Could not load video metadata for duration calculation");
        }
      }
    }
  };

  /* ---- Populate form on edit ---- */
  useEffect(() => {
    if (!isEdit || !movie) return;

    setTitle(movie.title || "");
    setOriginalTitle(movie.originalTitle || "");
    setDescription(movie.description || "");
    setShortDescription(movie.shortDescription || "");
    setPlanRequired(movie.planRequired || "free");
    setStatus(movie.status || "draft");

    if (movie.thumbnail)
      setThumbnail({ filePath: movie.thumbnail, preview: getImageUrl(movie.thumbnail) });
    if (movie.posterImage)
      setPoster({ filePath: movie.posterImage, preview: getImageUrl(movie.posterImage) });
    if (movie.bannerImage)
      setBanner({ filePath: movie.bannerImage, preview: getImageUrl(movie.bannerImage) });
    if (movie.seoImage)
      setSeoImage({ filePath: movie.seoImage, preview: getImageUrl(movie.seoImage) });

    if (movie.trailerUrl) {
      if (movie.trailerUrl.startsWith("http://") || movie.trailerUrl.startsWith("https://")) {
        setTrailerUrlType("url");
        setTrailerUrl(movie.trailerUrl);
      } else {
        setTrailerUrlType("local");
        setTrailerFilePath(movie.trailerUrl);
      }
    }

    setYear(movie.year ? String(movie.year) : "");
    setRating(movie.rating || "");
    setImdbRating(movie.imdbRating != null ? String(movie.imdbRating) : "");
    setDuration(movie.duration ? secsToDuration(movie.duration) : "");
    setReleaseDate(
      movie.releaseDate ? new Date(movie.releaseDate).toISOString().split("T")[0] : ""
    );
    setCountry(movie.country || "");
    setProducer(movie.producer || "");
    setStudio(movie.studio || "");
    setAgeRating(movie.ageRating != null ? String(movie.ageRating) : "0");
    setDownloadAllowed(movie.downloadAllowed !== false);
    setFeatured(!!movie.featured);
    setTrending(!!movie.trending);
    setIsNewContent(movie.isNewContent !== false);
    setIsExclusive(!!movie.isExclusive);
    setMaturityContent(Array.isArray(movie.maturityContent) ? movie.maturityContent : []);
    setTags(Array.isArray(movie.tags) ? movie.tags : []);

    if (Array.isArray(movie.genres))
      setSelectedGenres(movie.genres.map(getId).filter(Boolean));
    if (Array.isArray(movie.categories))
      setSelectedCategories(movie.categories.map(getId).filter(Boolean));
    if (Array.isArray(movie.languages))
      setSelectedLanguages(movie.languages.map(getId).filter(Boolean));
    if (Array.isArray(movie.audioLanguages))
      setSelectedAudioLanguages(movie.audioLanguages.map(getId).filter(Boolean));
    if (Array.isArray(movie.subtitleLanguages))
      setSelectedSubtitleLanguages(movie.subtitleLanguages.map(getId).filter(Boolean));
    if (Array.isArray(movie.sections))
      setSelectedSections(movie.sections.map(getId).filter(Boolean));

    if (Array.isArray(movie.cast)) {
      setCastItems(
        movie.cast.map((c: any, i: number) => ({
          id: String(i),
          actorId: getId(c.actor),
          character: c.character || "",
          role: c.role || "Actor",
        }))
      );
    }
    if (Array.isArray(movie.crew)) {
      setCrewItems(
        movie.crew.map((c: any, i: number) => ({
          id: String(i),
          directorId: getId(c.director),
          role: c.role || "Director",
        }))
      );
    }

     if (movie.hlsUrl) {
       const isHttp = movie.hlsUrl.startsWith("http://") || movie.hlsUrl.startsWith("https://");
       if (movie.hlsUrl.endsWith(".m3u8") && isHttp) {
         setVideoUploadType("hls");
         setVideoUrl(movie.hlsUrl);
       } else if (isHttp) {
         setVideoUploadType("url");
         setVideoUrl(movie.hlsUrl);
       } else {
         setVideoUploadType("local");
         setVideoFilePath(movie.hlsUrl);
       }
     }
    if (Array.isArray(movie.videoQualities) && movie.videoQualities.length > 0) {
      setQualityEnabled(true);
      setQualityRows(
        movie.videoQualities.map((q: any, i: number) => {
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

    if (Array.isArray(movie.subtitles) && movie.subtitles.length > 0) {
      setSubtitleRows(
        movie.subtitles.map((s: any, i: number) => ({
          id: String(i),
          language: getId(s.language),
          filePath: s.filePath || "",
        }))
      );
    }

    setSlug(movie.slug || "");
    setMetaTitle(movie.metaTitle || "");
    setMetaDescription(movie.metaDescription || "");
  }, [isEdit, movie]);

  /* ---- Helpers ---- */
  const addQualityRow = () =>
    setQualityRows((p) => [...p, { id: Date.now().toString(), type: "url", quality: "480p", filePath: "", url: "" }]);
  const removeQualityRow = (rowId: string) =>
    setQualityRows((p) => p.filter((r) => r.id !== rowId));
  const updateQualityRow = (rowId: string, key: keyof QualityRow, value: string) =>
    setQualityRows((p) => p.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)));

  const addSubtitleRow = () =>
    setSubtitleRows((p) => [...p, { id: Date.now().toString(), language: "", filePath: "" }]);
  const removeSubtitleRow = (rowId: string) =>
    setSubtitleRows((p) => p.filter((r) => r.id !== rowId));

  const addCastItem = () =>
    setCastItems((p) => [...p, { id: Date.now().toString(), actorId: "", character: "", role: "Actor" }]);
  const removeCastItem = (itemId: string) =>
    setCastItems((p) => p.filter((c) => c.id !== itemId));
  const updateCastItem = (itemId: string, key: keyof CastItem, value: string) =>
    setCastItems((p) => p.map((c) => (c.id === itemId ? { ...c, [key]: value } : c)));

  const addCrewItem = () =>
    setCrewItems((p) => [...p, { id: Date.now().toString(), directorId: "", role: "Director" }]);
  const removeCrewItem = (itemId: string) =>
    setCrewItems((p) => p.filter((c) => c.id !== itemId));
  const updateCrewItem = (itemId: string, key: keyof CrewItem, value: string) =>
    setCrewItems((p) => p.map((c) => (c.id === itemId ? { ...c, [key]: value } : c)));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const kw = tagInput.trim().replace(/,$/, "");
      if (!tags.includes(kw)) setTags((p) => [...p, kw]);
      setTagInput("");
    }
  };

  const handleMaturityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && maturityInput.trim()) {
      e.preventDefault();
      const val = maturityInput.trim().replace(/,$/, "");
      if (!maturityContent.includes(val)) setMaturityContent((p) => [...p, val]);
      setMaturityInput("");
    }
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const effectiveTrailerUrl = trailerUrlType === "local" ? trailerFilePath : trailerUrl;

      const payload: Record<string, any> = {
        title: title.trim(),
        originalTitle: originalTitle.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        thumbnail: thumbnail.filePath,
        posterImage: poster.filePath,
        bannerImage: banner.filePath,
        trailerUrl: effectiveTrailerUrl,
        planRequired,
        isFree: planRequired === "free",
        isLocked: planRequired !== "free",
        status,
        genres: selectedGenres,
        categories: selectedCategories,
        languages: selectedLanguages,
        subtitleLanguages: selectedSubtitleLanguages,
        audioLanguages: selectedAudioLanguages.length > 0 ? selectedAudioLanguages : selectedLanguages,
        year: year ? parseInt(year) : undefined,
        rating: rating.trim(),
        imdbRating: imdbRating ? parseFloat(imdbRating) : undefined,
        duration: duration ? durationToSecs(duration) : undefined,
        releaseDate: releaseDate ? new Date(releaseDate).toISOString() : undefined,
        country: country.trim(),
        producer: producer.trim(),
        studio: studio.trim(),
        ageRating: parseInt(ageRating) || 0,
        downloadAllowed,
        featured,
        trending,
        isNewContent,
        isExclusive,
        maturityContent,
        tags,
        sections: selectedSections,
        cast: castItems
          .filter((c) => c.actorId)
          .map((c) => ({ actor: c.actorId, character: c.character, role: c.role })),
        crew: crewItems
          .filter((c) => c.directorId)
          .map((c) => ({ director: c.directorId, role: c.role })),
        hlsUrl: videoUploadType === "local" ? videoFilePath : videoUrl,
        videoQualities: qualityEnabled
          ? qualityRows
              .filter((q) => q.url || q.filePath)
              .map((q) => ({
                quality: q.quality as any,
                url: q.type === "local" ? q.filePath : q.url,
                size: 0,
              }))
          : [],
        subtitles: subtitleRows
          .filter((r) => r.filePath && r.language)
          .map((r) => ({ language: r.language, filePath: r.filePath })),
        slug: slug.trim(),
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
        seoImage: seoImage.filePath,
      };

      if (isEdit) {
        await updateMovieMutation.mutateAsync({ id: id!, data: payload });
      } else {
        await createMovieMutation.mutateAsync(payload);
      }

      toast({ title: isEdit ? "Movie updated successfully!" : "Movie created successfully!" });
      setLocation("/movies");
    } catch (error: any) {
      toast({
        title: error?.message || "Failed to save movie. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* ---- Reusable ---- */
  const SectionHeading = ({ title: t }: { title: string }) => (
    <p className="text-base font-semibold text-foreground">{t}</p>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="rounded-xl border-2 border-dashed border-border bg-muted/10 py-16 flex flex-col items-center gap-3">
      <UploadIcon className="h-9 w-9 text-muted-foreground/80" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

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
    <div className="space-y-5 pb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setLocation("/movies")} className="hover:text-foreground transition-colors">
          Dashboard
        </button>
        <span>/</span>
        <button onClick={() => setLocation("/movies")} className="hover:text-foreground transition-colors">
          Movies
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Movie" : "New Movie"}</span>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
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

      {/* Tab Content */}
      <div className="rounded-xl border border-border bg-card">

        {/* =========== MOVIE DETAILS =========== */}
        {activeTab === "Movie Details" && (
          <div className="p-6 space-y-6">
            <SectionHeading title="About Movie" />

            {/* Images */}
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <div className="flex gap-5">
                <ImageBox label="Thumbnail" preview={thumbnail.preview} onOpen={() => setThumbnailPickerOpen(true)} />
                <ImageBox label="Poster Image" preview={poster.preview} onOpen={() => setPosterPickerOpen(true)} />
                <ImageBox label="Banner Image" preview={banner.preview} onOpen={() => setBannerPickerOpen(true)} />
              </div>
            </div>

            {/* Title + Original Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">
                  Title <span className="text-primary">*</span>
                </Label>
                <Input
                  placeholder="e.g. Avengers: Endgame"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Original Title</Label>
                <Input
                  placeholder="Original language title (optional)"
                  value={originalTitle}
                  onChange={(e) => setOriginalTitle(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Trailer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Trailer URL Type</Label>
                <Select value={trailerUrlType} onValueChange={setTrailerUrlType}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="url">External URL</SelectItem>
                    <SelectItem value="local">Local (Media Library)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                {trailerUrlType === "local" ? (
                  <>
                    <Label className="text-foreground text-sm font-medium">Trailer Video</Label>
                    <div
                      onClick={() => setTrailerPickerOpen(true)}
                      className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden w-full"
                    >
                      {trailerFilePath ? (
                        <span className="text-sm text-foreground truncate px-3 w-full text-center block" title={getImageUrl(trailerFilePath)}>
                          {getImageUrl(trailerFilePath)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Click to select from media library</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Label className="text-foreground text-sm font-medium">Trailer URL</Label>
                    <Input
                      placeholder="https://..."
                      value={trailerUrl}
                      onChange={(e) => setTrailerUrl(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-sm font-medium">
                  Description <span className="text-primary">*</span>
                </Label>
                <button className="text-xs text-primary hover:text-red-300 flex items-center gap-1.5 transition-colors">
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with AI
                </button>
              </div>
              <Textarea
                placeholder="Full movie description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-lg text-sm resize-none"
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm font-medium">Short Description</Label>
              <Textarea
                placeholder="Brief summary shown in listings..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={2}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-lg text-sm resize-none"
              />
            </div>

            {/* Plan + Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">
                  Plan Required <span className="text-primary">*</span>
                </Label>
                <Select value={planRequired} onValueChange={(v) => setPlanRequired(v as any)}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="moderation">Moderation</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Home Sections */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm font-medium">Home Categories (Sections)</Label>
              {sectionOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {sectionOptions.map((sec: any) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedSections(p => p.includes(sec.id) ? p.filter(id => id !== sec.id) : [...p, sec.id])}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedSections.includes(sec.id)
                          ? 'bg-primary text-primary-foreground border border-primary'
                          : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {sec.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">No home sections available. Create some in Home Layout Builder.</p>
              )}
              <p className="text-xs text-muted-foreground pt-1">Select the categories where this movie should be manually displayed.</p>
            </div>
          </div>
        )}

        {/* =========== BASIC INFO =========== */}
        {activeTab === "Basic Info" && (
          <div className="p-6 space-y-6">
            <SectionHeading title="Media Info" />
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <MultiSelect
                  label="Languages"
                  required
                  items={languagesList}
                  selected={selectedLanguages}
                  onAdd={(v) => setSelectedLanguages((p) => [...p, v])}
                  onRemove={(v) => setSelectedLanguages((p) => p.filter((x) => x !== v))}
                />
                <MultiSelect
                  label="Audio Languages"
                  items={languagesList}
                  selected={selectedAudioLanguages}
                  onAdd={(v) => setSelectedAudioLanguages((p) => [...p, v])}
                  onRemove={(v) => setSelectedAudioLanguages((p) => p.filter((x) => x !== v))}
                />
                <MultiSelect
                  label="Genres"
                  required
                  items={genresList}
                  selected={selectedGenres}
                  onAdd={(v) => setSelectedGenres((p) => [...p, v])}
                  onRemove={(v) => setSelectedGenres((p) => p.filter((x) => x !== v))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <MultiSelect
                  label="Categories"
                  items={categoriesList}
                  selected={selectedCategories}
                  onAdd={(v) => setSelectedCategories((p) => [...p, v])}
                  onRemove={(v) => setSelectedCategories((p) => p.filter((x) => x !== v))}
                />
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Country</Label>
                  <Select
                    value={country}
                    onValueChange={setCountry}
                  >
                    <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-foreground max-h-60 overflow-y-auto">
                      {(country && !countries.some((c: any) => c.name === country)
                        ? [{ id: "temp-saved", name: country }, ...countries]
                        : countries
                      ).map((c: any) => (
                        <SelectItem key={c.id || c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Year</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2024"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">IMDb Rating</Label>
                  <Input
                    type="number"
                    placeholder="0.0 – 10.0"
                    min="0"
                    max="10"
                    step="0.1"
                    value={imdbRating}
                    onChange={(e) => setImdbRating(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Content Rating</Label>
                  <Input
                    placeholder="e.g. PG-13, U/A, R"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Age Rating</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 0, 13, 18"
                    min="0"
                    value={ageRating}
                    onChange={(e) => setAgeRating(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">
                    Duration <span className="text-primary">*</span>
                  </Label>
                  <Input
                    type="time"
                    step="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-muted border-border text-foreground h-10 rounded-lg text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Format: HH:MM:SS</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">
                    Release Date <span className="text-primary">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="bg-muted border-border text-foreground h-10 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Producer</Label>
                  <Input
                    placeholder="Producer name"
                    value={producer}
                    onChange={(e) => setProducer(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Studio</Label>
                  <Input
                    placeholder="Production studio"
                    value={studio}
                    onChange={(e) => setStudio(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Maturity Content</Label>
                  <div
                    className="min-h-[42px] bg-muted border border-border rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-text"
                    onClick={() => document.getElementById("maturity-input")?.focus()}
                  >
                    {maturityContent.map((val) => (
                      <span key={val} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-600/20 text-yellow-300 text-xs font-medium">
                        {val}
                        <button type="button" onClick={(e) => { e.stopPropagation(); setMaturityContent((p) => p.filter((v) => v !== val)); }}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      id="maturity-input"
                      value={maturityInput}
                      onChange={(e) => setMaturityInput(e.target.value)}
                      onKeyDown={handleMaturityKeyDown}
                      placeholder={maturityContent.length === 0 ? "e.g. Violence, Language" : ""}
                      className="flex-1 min-w-[140px] bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Content flags */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Featured", value: featured, setter: setFeatured },
                  { label: "Trending", value: trending, setter: setTrending },
                  { label: "New Content", value: isNewContent, setter: setIsNewContent },
                  { label: "Exclusive", value: isExclusive, setter: setIsExclusive },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <Switch checked={value} onCheckedChange={setter} className="data-[state=checked]:bg-primary" />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                  <p className="text-sm font-medium text-foreground">Download Allowed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Allow users to download this content</p>
                </div>
                <Switch checked={downloadAllowed} onCheckedChange={setDownloadAllowed} className="data-[state=checked]:bg-primary" />
              </div>
            </div>

            {/* Cast & Crew */}
            <SectionHeading title="Cast & Crew" />
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-5">

              {/* Cast */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Cast (Actors)</p>
                  <Button type="button" onClick={addCastItem}
                    className="bg-primary hover:bg-primary/90 text-white h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add Actor
                  </Button>
                </div>
                {castItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cast added yet.</p>
                ) : (
                  castItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 rounded-xl border border-border bg-card">
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs font-medium">Actor</Label>
                        <Select value={item.actorId} onValueChange={(v) => updateCastItem(item.id, "actorId", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-9 rounded-lg text-sm">
                            <SelectValue placeholder="Select actor..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground max-h-60">
                            {actorsList.map((a: any) => (
                              <SelectItem key={getId(a)} value={getId(a)}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs font-medium">Character</Label>
                        <Input
                          placeholder="Character name"
                          value={item.character}
                          onChange={(e) => updateCastItem(item.id, "character", e.target.value)}
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs font-medium">Role</Label>
                        <Select value={item.role} onValueChange={(v) => updateCastItem(item.id, "role", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-9 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                            <SelectItem value="Actor">Actor</SelectItem>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Supporting">Supporting</SelectItem>
                            <SelectItem value="Cameo">Cameo</SelectItem>
                            <SelectItem value="Voice">Voice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <button type="button" onClick={() => removeCastItem(item.id)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Crew */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Crew (Directors)</p>
                  <Button type="button" onClick={addCrewItem}
                    className="bg-primary hover:bg-primary/90 text-white h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add Director
                  </Button>
                </div>
                {crewItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No crew added yet.</p>
                ) : (
                  crewItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-3 rounded-xl border border-border bg-card">
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs font-medium">Director</Label>
                        <Select value={item.directorId} onValueChange={(v) => updateCrewItem(item.id, "directorId", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-9 rounded-lg text-sm">
                            <SelectValue placeholder="Select director..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground max-h-60">
                            {directorsList.map((d: any) => (
                              <SelectItem key={getId(d)} value={getId(d)}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs font-medium">Role</Label>
                        <Select value={item.role} onValueChange={(v) => updateCrewItem(item.id, "role", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-9 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="Co-Director">Co-Director</SelectItem>
                            <SelectItem value="Executive Producer">Executive Producer</SelectItem>
                            <SelectItem value="Cinematographer">Cinematographer</SelectItem>
                            <SelectItem value="Editor">Editor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <button type="button" onClick={() => removeCrewItem(item.id)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========== QUALITY INFO =========== */}
        {activeTab === "Quality Info" && (
          <div className="p-6 space-y-6">
            <SectionHeading title="Video Source" />
            {isEdit && processingData?.data && (
              <div className="rounded-xl border border-border bg-muted/10 p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Upload:</span> Complete</p>
                <p><span className="text-muted-foreground">Transcoding:</span> {processingData.data.processingStatus === "processing" ? "In progress" : processingData.data.processingStatus === "ready" ? "Complete" : processingData.data.processingStatus === "failed" ? "Failed" : processingData.data.processingStatus}</p>
                <p><span className="text-muted-foreground">CDN:</span> {processingData.data.hlsUrl ? "Available" : "Waiting"}</p>
                <p><span className="text-muted-foreground">Playback:</span> {processingData.data.isReady ? "Ready" : "Not ready"}</p>
                {processingData.data.processingError && (
                  <p className="text-destructive">{processingData.data.processingError}</p>
                )}
              </div>
            )}
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Video Upload Type</Label>
                  <Select value={videoUploadType} onValueChange={setVideoUploadType}>
                    <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-foreground">
                      <SelectItem value="url">External URL</SelectItem>
                      <SelectItem value="local">Local (Media Library)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Video</Label>
                  {videoUploadType === "local" ? (
                    <div
                      onClick={() => setVideoPickerOpen(true)}
                      className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden w-full"
                    >
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
            </div>

            <SectionHeading title="Quality Variants" />
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
                      <div className="space-y-1.5">
                        <Label className="text-foreground text-sm font-medium">Quality</Label>
                        <Select value={row.quality} onValueChange={(v) => updateQualityRow(row.id, "quality", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                            <SelectItem value="144p">144p</SelectItem>
                            <SelectItem value="240p">240p</SelectItem>
                            <SelectItem value="360p">360p</SelectItem>
                            <SelectItem value="480p">480p</SelectItem>
                            <SelectItem value="720p">720p</SelectItem>
                            <SelectItem value="1080p">1080p</SelectItem>
                            <SelectItem value="4k">4K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 items-end min-w-0">
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Label className="text-foreground text-sm font-medium">Video File / URL</Label>
                          {row.type === "local" ? (
                            <div
                              onClick={() => { setCurrentQualityRowId(row.id); setQualityPickerOpen(true); }}
                              className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden w-full"
                            >
                              {row.filePath ? (
                                <span className="text-sm text-foreground truncate px-3 w-full text-center block" title={getImageUrl(row.filePath)}>
                                  {getImageUrl(row.filePath)}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Click to select</span>
                              )}
                            </div>
                          ) : (
                            <Input
                              placeholder="https://..."
                              value={row.url}
                              onChange={(e) => updateQualityRow(row.id, "url", e.target.value)}
                              className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                            />
                          )}
                        </div>
                        {qualityRows.length > 1 && (
                          <button type="button" onClick={() => removeQualityRow(row.id)}
                            className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
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

        {/* =========== SUBTITLE INFO =========== */}
        {activeTab === "Subtitle Info" && (
          <div className="p-6 space-y-6">
            <SectionHeading title="Subtitle Languages" />
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <MultiSelect
                label="Subtitle Languages"
                items={languagesList}
                selected={selectedSubtitleLanguages}
                onAdd={(v) => setSelectedSubtitleLanguages((p) => [...p, v])}
                onRemove={(v) => setSelectedSubtitleLanguages((p) => p.filter((x) => x !== v))}
                placeholder="Select subtitle languages..."
              />
            </div>

            <div className="flex items-center justify-between">
              <SectionHeading title="Subtitle Files" />
              <Button type="button" onClick={addSubtitleRow}
                className="bg-primary hover:bg-primary/90 text-white h-9 gap-2 rounded-lg px-4 text-sm font-semibold">
                <Plus className="h-4 w-4" /> Add Subtitle
              </Button>
            </div>

            {subtitleRows.length === 0 ? (
              <EmptyState message='No subtitle files added. Click "Add Subtitle" to upload .srt or .vtt files.' />
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
                            <span className="text-sm text-foreground truncate px-3 w-full text-center block" title={getImageUrl(row.filePath)}>
                              {getImageUrl(row.filePath)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Click to select subtitle file</span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeSubtitleRow(row.id)}
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

        {/* =========== SEO SETTINGS =========== */}
        {activeTab === "SEO Settings" && (
          <div className="p-6 space-y-5">
            <SectionHeading title="SEO Settings" />
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* SEO Image */}
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">SEO Image</Label>
                  <div
                    onClick={() => setSeoImagePickerOpen(true)}
                    className="border-2 border-dashed border-border rounded-xl h-40 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-card transition-colors overflow-hidden"
                  >
                    {seoImage.preview ? (
                      <img src={seoImage.preview} alt="SEO" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-sm font-medium">URL Slug</Label>
                    <Input
                      placeholder="e.g. avengers-endgame"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-sm font-medium">Meta Title</Label>
                      <span className="text-xs text-muted-foreground">{metaTitle.length}/100</span>
                    </div>
                    <Input
                      placeholder="Enter meta title"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value.slice(0, 100))}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Tags / Keywords</Label>
                <div
                  className="min-h-[42px] bg-muted border border-border rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-text"
                  onClick={() => document.getElementById("tag-input")?.focus()}
                >
                  {tags.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/20 text-red-300 text-xs font-medium">
                      {kw}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setTags((p) => p.filter((k) => k !== kw)); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? "Type and press Enter" : ""}
                    className="flex-1 min-w-[140px] bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-foreground text-sm font-medium">Meta Description</Label>
                  <span className="text-xs text-muted-foreground">{metaDescription.length}/200</span>
                </div>
                <Textarea
                  placeholder="Enter meta description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value.slice(0, 200))}
                  rows={4}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-lg text-sm resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold text-sm"
        >
          {isSaving ? "Saving..." : isEdit ? "Update Movie" : "Create Movie"}
        </Button>
      </div>

      {/* Media Pickers */}
      <MediaPicker open={thumbnailPickerOpen} onClose={() => setThumbnailPickerOpen(false)}
        onSelect={(m) => setThumbnail({ filePath: m.filePath, preview: m.url })} source="movie" accept="image/*" />
      <MediaPicker open={posterPickerOpen} onClose={() => setPosterPickerOpen(false)}
        onSelect={(m) => setPoster({ filePath: m.filePath, preview: m.url })} source="movie" accept="image/*" />
      <MediaPicker open={bannerPickerOpen} onClose={() => setBannerPickerOpen(false)}
        onSelect={(m) => setBanner({ filePath: m.filePath, preview: m.url })} source="movie" accept="image/*" />
      <MediaPicker open={trailerPickerOpen} onClose={() => setTrailerPickerOpen(false)}
        onSelect={(m) => setTrailerFilePath(m.filePath)} source="movie" accept="video/*" />
      <MediaPicker open={videoPickerOpen} onClose={() => setVideoPickerOpen(false)}
        onSelect={handleVideoSelect} source="movie" accept="video/*" />
      <MediaPicker
        open={qualityPickerOpen}
        onClose={() => { setQualityPickerOpen(false); setCurrentQualityRowId(null); }}
        onSelect={(m) => {
          if (currentQualityRowId) updateQualityRow(currentQualityRowId, "filePath", m.filePath);
        }}
        source="movie" accept="video/*"
      />
      <MediaPicker
        open={subtitlePickerOpen}
        onClose={() => { setSubtitlePickerOpen(false); setCurrentSubtitleRowId(null); }}
        onSelect={(m) => {
          if (currentSubtitleRowId)
            setSubtitleRows((p) => p.map((r) => r.id === currentSubtitleRowId ? { ...r, filePath: m.filePath } : r));
        }}
        source="movie" accept=".srt,.vtt,.ass,.ssa"
      />
      <MediaPicker open={seoImagePickerOpen} onClose={() => setSeoImagePickerOpen(false)}
        onSelect={(m) => setSeoImage({ filePath: m.filePath, preview: m.url })} source="movie" accept="image/*" />
    </div>
  );
}
