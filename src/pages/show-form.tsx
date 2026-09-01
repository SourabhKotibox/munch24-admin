import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Check,
  Upload,
  Link2,
  Film,
  X,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MediaPicker from "@/components/MediaPicker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useGetContentById,
  useGetCategoriesList,
  useUpdateContent,
  useCreateContent,
  getImageUrl,
} from "@/lib/api-client";

type UploadProgress = {
  loaded: number;
  total: number;
};

export default function ShowForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isCreate = location === "/shows/new";

  const { data: showData, isLoading } = useGetContentById(isCreate ? undefined : id);
  const { data: categoriesData } = useGetCategoriesList();
  const updateMutation = useUpdateContent();
  const createMutation = useCreateContent();

  const categories = categoriesData?.data || [];

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const uploadStartRef = useRef<number | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMode, setVideoMode] = useState("upload");
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    shortDescription: "",
    status: "active",
    featured: false,
    trending: false,
    genres: "",
    languages: "",
    thumbnail: "",
    bannerImage: "",
    videoUrl: "",
    reelDurationMinutes: 3,
    totalDurationMinutes: "",
    freeEpisodeCount: 1,
    lockEpisodes: true,
    categories: [] as string[],
  });

  useEffect(() => {
    if (!isCreate && showData?.content) {
      const data = showData.content;
      setFormData({
        title: data.title || "",
        description: data.description || "",
        shortDescription: data.shortDescription || "",
        status: (data.status === "published" || data.status === "active") ? "active" : "inactive",
        featured: data.featured || false,
        trending: data.trending || false,
        genres: (data.genres || []).join(", "),
        languages: (data.languages || []).join(", "),
        thumbnail: data.thumbnail || "",
        bannerImage: data.bannerImage || "",
        videoUrl: "",
        reelDurationMinutes: 3,
        totalDurationMinutes: "",
        freeEpisodeCount: 1,
        lockEpisodes: true,
        categories: (data.categories || []).map((c: any) => c._id || c.id || c),
      });
    }
  }, [showData, isCreate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isCreate) {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadSpeed("");
        uploadStartRef.current = null;
      
        const formDataToSend = new FormData();
        formDataToSend.append("title", formData.title);
        formDataToSend.append("subtitle", formData.shortDescription);
        formDataToSend.append("description", formData.description);
        formDataToSend.append("genres", formData.genres);
        formDataToSend.append("languages", formData.languages);
        formDataToSend.append("categoryIds", formData.categories.join(","));
        formDataToSend.append("reelDurationMinutes", formData.reelDurationMinutes.toString());
        if (formData.totalDurationMinutes) {
          formDataToSend.append("totalDurationMinutes", formData.totalDurationMinutes);
        }
        formDataToSend.append("freeEpisodeCount", formData.freeEpisodeCount.toString());
        formDataToSend.append("lockEpisodes", formData.lockEpisodes.toString());

        if (formData.thumbnail) {
          formDataToSend.append("thumbnail", formData.thumbnail);
        }
        if (formData.bannerImage) {
          formDataToSend.append("bannerImage", formData.bannerImage);
        }

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

        await createMutation.mutateAsync({ data: formDataToSend, onUploadProgress });
        toast({ title: "Show created successfully! HLS processing started in background." });

        queryClient.invalidateQueries({ queryKey: ["content-list"] });
        queryClient.invalidateQueries({ queryKey: ["categories-list"] });
        queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
        setLocation("/shows");
      } else {
        const payload = {
          ...formData,
          genres: formData.genres.split(",").map((g) => g.trim()).filter(Boolean),
          languages: formData.languages.split(",").map((l) => l.trim()).filter(Boolean),
        };

        await updateMutation.mutateAsync({ id, data: payload });
        toast({ title: "Show updated successfully!" });
        queryClient.invalidateQueries({ queryKey: ["content-list"] });
        queryClient.invalidateQueries({ queryKey: ["content", id] });
        queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
      }
    } catch (error) {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      if (isCreate) {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadSpeed("");
        uploadStartRef.current = null;
      }
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((cid) => cid !== categoryId)
        : [...prev.categories, categoryId],
    }));
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

  if (!isCreate && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading show...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => setLocation("/shows")}>
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isCreate ? "Add New Show" : "Edit Show"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isCreate
              ? "Upload a video to create a new show with episodes"
              : `Edit "${formData.title}" and assign it to categories`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle>Basic Info</CardTitle>
                <CardDescription>Core information about your show</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Input
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shortDescription: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={5}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {!isCreate && (
                    <div className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <Label htmlFor="status">Active</Label>
                        <p className="text-xs text-muted-foreground">Set show as active</p>
                      </div>
                      <Switch
                        id="status"
                        checked={formData.status === "active"}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            status: checked ? "active" : "inactive",
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="genres">Genres</Label>
                    <Input
                      id="genres"
                      placeholder="Action, Drama, Comedy"
                      value={formData.genres}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, genres: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages</Label>
                    <Input
                      id="languages"
                      placeholder="English, Hindi, Tamil"
                      value={formData.languages}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, languages: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Artwork</CardTitle>
                </div>
                <CardDescription>Thumbnail and banner image for your show</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Thumbnail */}
                <div className="space-y-3">
                  <Label>Thumbnail</Label>
                  {formData.thumbnail ? (
                    <div className="group relative inline-block">
                      <img
                        src={getImageUrl(formData.thumbnail)}
                        alt="Thumbnail preview"
                        className="h-40 w-28 rounded-md object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, thumbnail: "" }))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setThumbnailPickerOpen(true)}
                      className="h-40 w-28 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setThumbnailPickerOpen(true)}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {formData.thumbnail ? "Change Thumbnail" : "Pick from Media Library"}
                  </Button>
                  <MediaPicker
                    open={thumbnailPickerOpen}
                    onClose={() => setThumbnailPickerOpen(false)}
                    onSelect={(media) => setFormData((prev) => ({ ...prev, thumbnail: media.filePath || media.url }))}
                    source="show"
                    accept="image/*"
                  />
                </div>

                {/* Banner Image */}
                <div className="space-y-3">
                  <Label>Banner Image</Label>
                  {formData.bannerImage ? (
                    <div className="group relative inline-block">
                      <img
                        src={getImageUrl(formData.bannerImage)}
                        alt="Banner preview"
                        className="h-28 w-64 rounded-md object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, bannerImage: "" }))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setBannerPickerOpen(true)}
                      className="h-28 w-64 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBannerPickerOpen(true)}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {formData.bannerImage ? "Change Banner" : "Pick from Media Library"}
                  </Button>
                  <MediaPicker
                    open={bannerPickerOpen}
                    onClose={() => setBannerPickerOpen(false)}
                    onSelect={(media) => setFormData((prev) => ({ ...prev, bannerImage: media.filePath || media.url }))}
                    source="show"
                    accept="image/*"
                  />
                </div>
              </CardContent>
            </Card>

            {isCreate && (
              <>
                <Card className="rounded-lg shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Film className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>Episode Settings</CardTitle>
                    </div>
                    <CardDescription>
                      Configure how your video is split into episodes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="reelDurationMinutes">
                          Reel Duration (minutes)
                        </Label>
                        <Input
                          id="reelDurationMinutes"
                          type="number"
                          min="1"
                          value={formData.reelDurationMinutes}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              reelDurationMinutes:
                                parseInt(e.target.value, 10) || 3,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalDurationMinutes">
                          Total Duration (minutes)
                        </Label>
                        <Input
                          id="totalDurationMinutes"
                          type="number"
                          min="1"
                          placeholder="Required if ffprobe is unavailable"
                          value={formData.totalDurationMinutes}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              totalDurationMinutes: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="freeEpisodeCount">
                          Free Episode Count
                        </Label>
                        <Input
                          id="freeEpisodeCount"
                          type="number"
                          min="0"
                          value={formData.freeEpisodeCount}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              freeEpisodeCount:
                                parseInt(e.target.value, 10) || 1,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border p-3">
                        <div>
                          <Label htmlFor="lockEpisodes">Lock Episodes</Label>
                          <p className="text-xs text-muted-foreground">
                            Lock episodes after free ones
                          </p>
                        </div>
                        <Switch
                          id="lockEpisodes"
                          checked={formData.lockEpisodes}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              lockEpisodes: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Film className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>Video</CardTitle>
                    </div>
                    <CardDescription>
                      Upload your show video to split into episodes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <Label>Video File *</Label>
                      <Tabs value={videoMode} onValueChange={setVideoMode}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="url">
                            <Link2 className="w-4 h-4 mr-2" />
                            URL
                          </TabsTrigger>
                          <TabsTrigger value="upload">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload File
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="url" className="mt-4 space-y-4">
                          <Input
                            placeholder="https://example.com/video.mp4"
                            value={formData.videoUrl}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                videoUrl: e.target.value,
                              }))
                            }
                          />
                        </TabsContent>
                        <TabsContent value="upload" className="mt-4 space-y-4">
                          <Input
                            type="file"
                            accept="video/*"
                            onChange={(e) =>
                              setVideoFile(e.target.files?.[0] || null)
                            }
                            required
                          />
                          {videoFile && (
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {videoFile.name} ({formatBytes(videoFile.size)})
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => setVideoFile(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="space-y-6">
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Select which categories this show appears in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isOpen}
                      className="w-full justify-between"
                    >
                      {formData.categories.length > 0
                        ? `${formData.categories.length} category(ies) selected`
                        : "Select categories..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search categories..." />
                      <CommandList>
                        <CommandEmpty>No categories found.</CommandEmpty>
                        <CommandGroup>
                          {categories.map((category: any) => {
                            const catId = category._id || category.id;
                            const isSelected =
                              formData.categories.includes(catId);
                            return (
                              <CommandItem
                                key={catId}
                                value={catId}
                                onSelect={() => toggleCategory(catId)}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{category.name}</span>
                                  {isSelected && (
                                    <Check className="h-4 w-4" />
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.categories.map((catId) => {
                      const cat = categories.find(
                        (c: any) => (c._id || c.id) === catId
                      );
                      return cat ? (
                        <Badge key={catId} variant="secondary">
                          {cat.name}
                          <button
                            type="button"
                            onClick={() => toggleCategory(catId)}
                            className="ml-2 hover:text-primary"
                          >
                            <span className="text-xs">×</span>
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {!isCreate && (
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    Featured and trending settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="featured">Featured</Label>
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          featured: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="trending">Trending</Label>
                    <Switch
                      id="trending"
                      checked={formData.trending}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          trending: checked,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {isCreate && isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>
                {uploadSpeed
                  ? `${uploadProgress}% · ${uploadSpeed}`
                  : `${uploadProgress}%`}
              </span>
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
          <Button type="button" variant="ghost" onClick={() => setLocation("/shows")}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              (isCreate ? createMutation.isPending : updateMutation.isPending) ||
              (isCreate && isUploading)
            }
          >
            {isCreate ? "Create Show" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
