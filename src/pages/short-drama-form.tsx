import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ImageIcon, Plus, X, Trash2, Sparkles,
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
  useGetDirectors, useGetActors, useGetCrews, useGetContentById, useCreateContent, useUpdateContent,
  useGetGenres, useGetLanguagesList, useGetCategoriesList,
  useGetSections, getImageUrl, useGetCountries,
  createEpisode, updateEpisode,
} from "@/lib/api-client";

type Tab = "Short Drama" | "Basic Info" | "SEO Settings";
const TABS: Tab[] = ["Short Drama", "Basic Info", "SEO Settings"];

type CastItem       = { id: string; actorId: string; character: string; role: string };
type CrewItem       = { id: string; directorId: string; role: string };
type CrewMemberItem = { id: string; crewId: string; role: string };

const secsToDuration = (s: number): string => {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
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

export default function ShortDramaForm() {
  const { toast }       = useToast();
  const [, setLocation] = useLocation();
  const { id }          = useParams<{ id: string }>();
  const isEdit          = !!id;

  const [activeTab, setActiveTab] = useState<Tab>("Short Drama");

  /* ---- Media picker states ---- */
  const [thumbnailPickerOpen, setThumbnailPickerOpen]   = useState(false);
  const [posterPickerOpen, setPosterPickerOpen]         = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen]         = useState(false);
  const [trailerPickerOpen, setTrailerPickerOpen]       = useState(false);
  const [seoImagePickerOpen, setSeoImagePickerOpen]     = useState(false);

  /* ---- API data ---- */
  const { data: directorsData }  = useGetDirectors({ page: 1, limit: 500 });
  const directorsList            = (directorsData as any)?.data || [];
  const { data: actorsData }     = useGetActors({ page: 1, limit: 500 });
  const actorsList               = (actorsData as any)?.data || [];
  const { data: crewsData }      = useGetCrews({ page: 1, limit: 500 });
  const crewsList                = (crewsData as any)?.data || [];
  const { data: genresData }     = useGetGenres({ page: 1, limit: 100 });
  const genresList               = (genresData as any)?.data || [];
  const { data: languagesData }  = useGetLanguagesList();
  const languagesList            = (languagesData as any)?.data || [];
  const { data: categoriesData } = useGetCategoriesList({ limit: 100 });
  const categoriesList           = (categoriesData as any)?.data || [];
  const { data: countriesData }  = useGetCountries({ limit: 300 });
  const countries                = (countriesData as any)?.data || [];
  const { data: sectionsData }   = useGetSections({ contentType: "drama", activeOnly: true });
  const sectionOptions           = sectionsData?.data?.map((s: any) => ({ id: s.id || s._id, title: s.title })) || [];

  const { data: existingData } = useGetContentById(isEdit ? id! : "");
  const createMutation         = useCreateContent();
  const updateMutation         = useUpdateContent();

  const content = (existingData as any)?.content;

  /* ---- Short Drama tab state ---- */
  const [thumbnail, setThumbnail]               = useState({ filePath: "", preview: "" });
  const [poster, setPoster]                     = useState({ filePath: "", preview: "" });
  const [banner, setBanner]                     = useState({ filePath: "", preview: "" });
  const [title, setTitle]                       = useState("");
  const [originalTitle, setOriginalTitle]       = useState("");
  const [trailerUrlType, setTrailerUrlType]     = useState("url");
  const [trailerUrl, setTrailerUrl]             = useState("");
  const [trailerFilePath, setTrailerFilePath]   = useState("");
  const [description, setDescription]           = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [planRequired, setPlanRequired]         = useState<"free" | "basic" | "standard" | "premium">("free");
  const [status, setStatus]                     = useState<"published" | "draft" | "processing" | "moderation" | "rejected">("draft");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  /* ---- Basic Info state ---- */
  const [selectedLanguages, setSelectedLanguages]           = useState<string[]>([]);
  const [selectedAudioLanguages, setSelectedAudioLanguages] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres]                 = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories]         = useState<string[]>([]);
  const [year, setYear]                                     = useState("");
  const [rating, setRating]                                 = useState("");
  const [imdbRating, setImdbRating]                         = useState("");
  const [ageRating, setAgeRating]                           = useState("0");
  const [duration, setDuration]                             = useState("");
  const [releaseDate, setReleaseDate]                       = useState("");
  const [country, setCountry]                               = useState("");
  const [producer, setProducer]                             = useState("");
  const [studio, setStudio]                                 = useState("");
  const [seasons, setSeasons]                               = useState("");
  const [downloadAllowed, setDownloadAllowed]               = useState(true);
  const [featured, setFeatured]                             = useState(false);
  const [trending, setTrending]                             = useState(false);
  const [isNewContent, setIsNewContent]                     = useState(true);
  const [isExclusive, setIsExclusive]                       = useState(false);
  const [maturityContent, setMaturityContent]               = useState<string[]>([]);
  const [maturityInput, setMaturityInput]                   = useState("");
  const [castItems, setCastItems]                           = useState<CastItem[]>([]);
  const [crewItems, setCrewItems]                           = useState<CrewItem[]>([]);
  const [crewMemberItems, setCrewMemberItems]               = useState<CrewMemberItem[]>([]);

  /* ---- SEO Settings state ---- */
  const [seoImage, setSeoImage]         = useState({ filePath: "", preview: "" });
  const [slug, setSlug]                 = useState("");
  const [metaTitle, setMetaTitle]       = useState("");
  const [tags, setTags]                 = useState<string[]>([]);
  const [tagInput, setTagInput]         = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  /* ---- Populate form on edit ---- */
  useEffect(() => {
    if (!isEdit || !content) return;

    setTitle(content.title || "");
    setOriginalTitle(content.originalTitle || "");
    setDescription(content.description || "");
    setShortDescription(content.shortDescription || "");
    setPlanRequired(content.planRequired || "free");
    setStatus(content.status || "draft");

    if (content.thumbnail)
      setThumbnail({ filePath: content.thumbnail, preview: getImageUrl(content.thumbnail) });
    if (content.posterImage)
      setPoster({ filePath: content.posterImage, preview: getImageUrl(content.posterImage) });
    if (content.bannerImage)
      setBanner({ filePath: content.bannerImage, preview: getImageUrl(content.bannerImage) });
    if (content.seoImage)
      setSeoImage({ filePath: content.seoImage, preview: getImageUrl(content.seoImage) });

    if (content.trailerUrl) {
      if (content.trailerUrl.startsWith("http://") || content.trailerUrl.startsWith("https://")) {
        setTrailerUrlType("url");
        setTrailerUrl(content.trailerUrl);
      } else {
        setTrailerUrlType("local");
        setTrailerFilePath(content.trailerUrl);
      }
    }

    setYear(content.year ? String(content.year) : "");
    setRating(content.rating || "");
    setImdbRating(content.imdbRating != null ? String(content.imdbRating) : "");
    setAgeRating(content.ageRating != null ? String(content.ageRating) : "0");
    setDuration(content.duration ? secsToDuration(content.duration) : "");
    setReleaseDate(
      content.releaseDate
        ? new Date(content.releaseDate).toISOString().split("T")[0]
        : content.year ? `${content.year}-01-01` : ""
    );
    setCountry(content.country || "");
    setProducer(content.producer || "");
    setStudio(content.studio || "");
    setSeasons(content.seasons != null ? String(content.seasons) : "");
    setDownloadAllowed(content.downloadAllowed !== false);
    setFeatured(!!content.featured);
    setTrending(!!content.trending);
    setIsNewContent(content.isNewContent !== false);
    setIsExclusive(!!content.isExclusive);
    setMaturityContent(Array.isArray(content.maturityContent) ? content.maturityContent : []);

    if (Array.isArray(content.genres))
      setSelectedGenres(content.genres.map((g: any) => getId(g)).filter(Boolean));
    if (Array.isArray(content.categories))
      setSelectedCategories(content.categories.map((c: any) => getId(c)).filter(Boolean));
    if (Array.isArray(content.languages))
      setSelectedLanguages(content.languages.map((l: any) => getId(l)).filter(Boolean));
    if (Array.isArray(content.audioLanguages))
      setSelectedAudioLanguages(content.audioLanguages.map((l: any) => getId(l)).filter(Boolean));

    if (Array.isArray(content.sections))
      setSelectedSections(content.sections.map((s: any) => getId(s)).filter(Boolean));

    if (Array.isArray(content.cast)) {
      setCastItems(
        content.cast.map((c: any, i: number) => ({
          id: String(i),
          actorId: getId(c.actor),
          character: c.character || "",
          role: c.role || "Actor",
        }))
      );
    }
    if (Array.isArray(content.crew)) {
      setCrewItems(
        content.crew.map((c: any, i: number) => ({
          id: String(i),
          directorId: getId(c.director),
          role: c.role || "Director",
        }))
      );
    }
    if (Array.isArray(content.crewMembers)) {
      setCrewMemberItems(
        content.crewMembers.map((c: any, i: number) => ({
          id: String(i),
          crewId: getId(c.crewMember),
          role: c.role || "Crew",
        }))
      );
    }

    setSlug(content.slug || "");
    setMetaTitle(content.metaTitle || "");
    setMetaDescription(content.metaDescription || "");
    setTags(Array.isArray(content.tags) ? content.tags : []);
  }, [isEdit, content]);

  /* ---- Helpers ---- */
  const makeChipHandler = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>,
    inputValue: string
  ) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const val = inputValue.trim().replace(/,$/, "");
      setter((p) => (p.includes(val) ? p : [...p, val]));
      inputSetter("");
    }
  };

  const addCastItem    = () =>
    setCastItems((p) => [...p, { id: Date.now().toString(), actorId: "", character: "", role: "Actor" }]);
  const removeCastItem = (itemId: string) =>
    setCastItems((p) => p.filter((c) => c.id !== itemId));
  const updateCastItem = (itemId: string, key: keyof CastItem, value: string) =>
    setCastItems((p) => p.map((c) => (c.id === itemId ? { ...c, [key]: value } : c)));

  const addCrewItem    = () =>
    setCrewItems((p) => [...p, { id: Date.now().toString(), directorId: "", role: "Director" }]);
  const removeCrewItem = (itemId: string) =>
    setCrewItems((p) => p.filter((c) => c.id !== itemId));
  const updateCrewItem = (itemId: string, key: keyof CrewItem, value: string) =>
    setCrewItems((p) => p.map((c) => (c.id === itemId ? { ...c, [key]: value } : c)));

  const addCrewMemberItem    = () =>
    setCrewMemberItems((p) => [...p, { id: Date.now().toString(), crewId: "", role: "Crew" }]);
  const removeCrewMemberItem = (itemId: string) =>
    setCrewMemberItems((p) => p.filter((c) => c.id !== itemId));
  const updateCrewMemberItem = (itemId: string, key: keyof CrewMemberItem, value: string) =>
    setCrewMemberItems((p) => p.map((c) => (c.id === itemId ? { ...c, [key]: value } : c)));

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
        type: "series",
        contentType: "drama",
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
        crewMembers: crewMemberItems
          .filter((c) => c.crewId)
          .map((c) => ({ crewMember: c.crewId, role: c.role })),
        seasons: seasons ? parseInt(seasons) : undefined,
        slug: slug.trim(),
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
        seoImage: seoImage.filePath,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
      } else {
        await createMutation.mutateAsync({ data: JSON.stringify(payload) });
      }

      toast({ title: isEdit ? "Short Drama updated successfully!" : "Short Drama created successfully!" });
      setLocation("/short-dramas");
    } catch (error: any) {
      toast({
        title: error?.message || "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* ---- Reusable components ---- */
  const SH = ({ title: t }: { title: string }) => (
    <p className="text-base font-semibold text-foreground">{t}</p>
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
        <button onClick={() => setLocation("/short-dramas")} className="hover:text-foreground transition-colors">
          Dashboard
        </button>
        <span>/</span>
        <button onClick={() => setLocation("/short-dramas")} className="hover:text-foreground transition-colors">
          Short Dramas
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Short Drama" : "New Short Drama"}</span>
      </div>

      {/* Tabs */}
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

        {/* =========== SHORT DRAMA =========== */}
        {activeTab === "Short Drama" && (
          <div className="p-6 space-y-6">
            <SH title="About Short Drama" />

            {/* Images */}
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <div className="flex gap-5">
                <ImageBox label="Thumbnail"    preview={thumbnail.preview} onOpen={() => setThumbnailPickerOpen(true)} />
                <ImageBox label="Poster Image" preview={poster.preview}    onOpen={() => setPosterPickerOpen(true)} />
                <ImageBox label="Banner Image" preview={banner.preview}    onOpen={() => setBannerPickerOpen(true)} />
              </div>
            </div>

            {/* Title + Original Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">
                  Title <span className="text-primary">*</span>
                </Label>
                <Input
                  placeholder="e.g. My Drama Title"
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
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm font-medium">Trailer URL Type</Label>
              <Select value={trailerUrlType} onValueChange={setTrailerUrlType}>
                <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm w-52">
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

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-sm font-medium">
                  Description <span className="text-primary">*</span>
                </Label>
                <button className="text-xs text-primary hover:text-red-300 flex items-center gap-1.5 transition-colors">
                  <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </button>
              </div>
              <Textarea
                placeholder="Full short drama description..."
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
                      onClick={() =>
                        setSelectedSections((p) =>
                          p.includes(sec.id) ? p.filter((x) => x !== sec.id) : [...p, sec.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedSections.includes(sec.id)
                          ? "bg-primary text-primary-foreground border border-primary"
                          : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {sec.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                  No home sections available. Create some in Home Layout Builder.
                </p>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Select the categories where this drama should be manually displayed.
              </p>
            </div>
          </div>
        )}

        {/* =========== BASIC INFO =========== */}
        {activeTab === "Basic Info" && (
          <div className="p-6 space-y-6">
            <SH title="Media Info" />
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-5">
              {/* Languages + Audio Languages + Genres */}
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
                  <Select value={country} onValueChange={setCountry}>
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
                  <Label className="text-foreground text-sm font-medium">Content Rating</Label>
                  <Input placeholder="e.g. PG-13, TV-MA" value={rating} onChange={(e) => setRating(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                </div>
              </div>

              {/* Year + Seasons + IMDb + Age */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Year</Label>
                  <Input type="number" placeholder="2024" value={year} onChange={(e) => setYear(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Seasons</Label>
                  <Input type="number" placeholder="1" min="1" value={seasons} onChange={(e) => setSeasons(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">IMDb Rating</Label>
                  <Input type="number" placeholder="0.0–10.0" min="0" max="10" step="0.1" value={imdbRating}
                    onChange={(e) => setImdbRating(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Age Rating</Label>
                  <Input type="number" placeholder="0" min="0" value={ageRating} onChange={(e) => setAgeRating(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                </div>
              </div>

              {/* Duration + Release Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Episode Duration</Label>
                  <Input type="time" step="1" value={duration} onChange={(e) => setDuration(e.target.value)}
                    className="bg-muted border-border text-foreground h-10 rounded-lg text-sm" />
                  <p className="text-xs text-muted-foreground">Format: HH:MM:SS</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Release Date</Label>
                  <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)}
                    className="bg-muted border-border text-foreground h-10 rounded-lg text-sm" />
                </div>
              </div>

              {/* Producer + Studio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Producer</Label>
                  <Input placeholder="Producer name" value={producer} onChange={(e) => setProducer(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Studio</Label>
                  <Input placeholder="Production studio" value={studio} onChange={(e) => setStudio(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                </div>
              </div>

              {/* Maturity Content */}
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Maturity Content</Label>
                <div
                  className="min-h-[42px] bg-muted border border-border rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-text"
                  onClick={() => document.getElementById("drama-maturity-input")?.focus()}
                >
                  {maturityContent.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/20 text-red-300 text-xs font-medium">
                      {v}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMaturityContent((p) => p.filter((x) => x !== v)); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="drama-maturity-input"
                    value={maturityInput}
                    onChange={(e) => setMaturityInput(e.target.value)}
                    onKeyDown={makeChipHandler(setMaturityContent, setMaturityInput, maturityInput)}
                    placeholder={maturityContent.length === 0 ? "e.g. Violence, Language, Adult..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Featured",     value: featured,     setter: setFeatured },
                  { label: "Trending",     value: trending,     setter: setTrending },
                  { label: "New Content",  value: isNewContent, setter: setIsNewContent },
                  { label: "Exclusive",    value: isExclusive,  setter: setIsExclusive },
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
                  <p className="text-xs text-muted-foreground mt-0.5">Allow users to download episodes</p>
                </div>
                <Switch checked={downloadAllowed} onCheckedChange={setDownloadAllowed} className="data-[state=checked]:bg-primary" />
              </div>
            </div>

            {/* Cast & Crew */}
            <SH title="Cast & Crew" />
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
                        <Input placeholder="Character name" value={item.character}
                          onChange={(e) => updateCastItem(item.id, "character", e.target.value)}
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 rounded-lg text-sm" />
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

              {/* Directors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Directors</p>
                  <Button type="button" onClick={addCrewItem}
                    className="bg-primary hover:bg-primary/90 text-white h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add Director
                  </Button>
                </div>
                {crewItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No directors added yet.</p>
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

              {/* Crew Members */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Crew Members</p>
                  <Button type="button" onClick={addCrewMemberItem}
                    className="bg-primary hover:bg-primary/90 text-white h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add Crew Member
                  </Button>
                </div>
                {crewMemberItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No crew members added yet.</p>
                ) : (
                  crewMemberItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-3 rounded-xl border border-border bg-card">
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs font-medium">Crew Member</Label>
                        <Select value={item.crewId} onValueChange={(v) => updateCrewMemberItem(item.id, "crewId", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-9 rounded-lg text-sm">
                            <SelectValue placeholder="Select crew member..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground max-h-60">
                            {crewsList.map((c: any) => (
                              <SelectItem key={getId(c)} value={getId(c)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs font-medium">Role</Label>
                        <Select value={item.role} onValueChange={(v) => updateCrewMemberItem(item.id, "role", v)}>
                          <SelectTrigger className="bg-muted border-border text-foreground h-9 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground">
                            <SelectItem value="Crew">Crew</SelectItem>
                            <SelectItem value="Writer">Writer</SelectItem>
                            <SelectItem value="Producer">Producer</SelectItem>
                            <SelectItem value="Cinematographer">Cinematographer</SelectItem>
                            <SelectItem value="Editor">Editor</SelectItem>
                            <SelectItem value="Music Composer">Music Composer</SelectItem>
                            <SelectItem value="Art Director">Art Director</SelectItem>
                            <SelectItem value="Costume Designer">Costume Designer</SelectItem>
                            <SelectItem value="Sound Designer">Sound Designer</SelectItem>
                            <SelectItem value="VFX Supervisor">VFX Supervisor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <button type="button" onClick={() => removeCrewMemberItem(item.id)}
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

        {/* =========== SEO SETTINGS =========== */}
        {activeTab === "SEO Settings" && (
          <div className="p-6 space-y-5">
            <SH title="SEO Settings" />
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">SEO Image</Label>
                  <div onClick={() => setSeoImagePickerOpen(true)}
                    className="border-2 border-dashed border-border rounded-xl h-40 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-card transition-colors overflow-hidden">
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
                      placeholder="e.g. my-drama-title"
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
                  onClick={() => document.getElementById("drama-tag-input")?.focus()}
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
                    id="drama-tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={makeChipHandler(setTags, setTagInput, tagInput)}
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

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold text-sm"
        >
          {isSaving ? "Saving..." : isEdit ? "Update Short Drama" : "Create Short Drama"}
        </Button>
      </div>

      {/* Media Pickers */}
      <MediaPicker open={thumbnailPickerOpen} onClose={() => setThumbnailPickerOpen(false)}
        onSelect={(m) => setThumbnail({ filePath: m.filePath, preview: m.url })} source="drama" accept="image/*" />
      <MediaPicker open={posterPickerOpen} onClose={() => setPosterPickerOpen(false)}
        onSelect={(m) => setPoster({ filePath: m.filePath, preview: m.url })} source="drama" accept="image/*" />
      <MediaPicker open={bannerPickerOpen} onClose={() => setBannerPickerOpen(false)}
        onSelect={(m) => setBanner({ filePath: m.filePath, preview: m.url })} source="drama" accept="image/*" />
      <MediaPicker open={trailerPickerOpen} onClose={() => setTrailerPickerOpen(false)}
        onSelect={(m) => setTrailerFilePath(m.filePath)} source="drama" accept="video/*" />
      <MediaPicker open={seoImagePickerOpen} onClose={() => setSeoImagePickerOpen(false)}
        onSelect={(m) => setSeoImage({ filePath: m.filePath, preview: m.url })} source="drama" accept="image/*" />
    </div>
  );
}
