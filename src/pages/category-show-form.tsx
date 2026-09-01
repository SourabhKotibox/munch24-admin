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
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import {
  useGetCategoryById,
  useGetCategoriesList,
  useCreateCategoryShow,
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

type FormDataState = {
  title: string;
  subtitle: string;
  description: string;
  genres: string;
  languages: string;
  reelDurationMinutes: number;
  totalDurationMinutes: string;
  freeEpisodeCount: number;
  lockEpisodes: boolean;
  thumbnail: string;
  videoUrl: string;
  selectedCategoryIds: string[];
};

export default function CategoryShowForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [, setLocation] = useLocation();

  const { data: categoryData } = useGetCategoryById(categoryId);
  const { data: categoriesData } = useGetCategoriesList();
  const createMutation = useCreateCategoryShow();

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const uploadStartRef = useRef<number | null>(null);

  const allCategories: Category[] = categoriesData?.data || [];

  const [formData, setFormData] = useState<FormDataState>({
    title: "",
    subtitle: "",
    description: "",
    genres: "",
    languages: "",
    reelDurationMinutes: 3,
    totalDurationMinutes: "",
    freeEpisodeCount: 1,
    lockEpisodes: true,
    thumbnail: "",
    videoUrl: "",
    selectedCategoryIds: categoryId ? [categoryId] : [],
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [thumbnailMode, setThumbnailMode] = useState("upload");
  const [videoMode, setVideoMode] = useState("upload");

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

  const toggleCategory = (catId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedCategoryIds.includes(catId);
      return {
        ...prev,
        selectedCategoryIds: isSelected
          ? prev.selectedCategoryIds.filter((id) => id !== catId)
          : [...prev.selectedCategoryIds, catId],
      };
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadSpeed("");
      uploadStartRef.current = null;
      
      const formDataToSend = new FormData();
      // Send categoryIds as comma-separated string
      formDataToSend.append("categoryIds", formData.selectedCategoryIds.join(","));
      formDataToSend.append("title", formData.title);
      formDataToSend.append("subtitle", formData.subtitle);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("genres", formData.genres);
      formDataToSend.append("languages", formData.languages);
      formDataToSend.append("reelDurationMinutes", formData.reelDurationMinutes.toString());
      if (formData.totalDurationMinutes) {
        formDataToSend.append("totalDurationMinutes", formData.totalDurationMinutes);
      }
      formDataToSend.append("freeEpisodeCount", formData.freeEpisodeCount.toString());
      formDataToSend.append("lockEpisodes", formData.lockEpisodes.toString());

      if (thumbnailMode === "url") {
        if (formData.thumbnail) {
          formDataToSend.append("thumbnail", formData.thumbnail);
        }
      } else if (thumbnailFile) {
        formDataToSend.append("thumbnailFile", thumbnailFile);
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

      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
      queryClient.invalidateQueries({ queryKey: ["category-contents"] });
      // If we have at least one category, go back to that category's shows
      if (formData.selectedCategoryIds.length > 0) {
        setLocation(`/categories/${formData.selectedCategoryIds[0]}/shows`);
      } else {
        setLocation("/categories");
      }
    } catch (error) {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadSpeed("");
      uploadStartRef.current = null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => setLocation(`/categories/${categoryId}/shows`)}>
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Add New Show
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload a video to create a new show with episodes
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Show Details</CardTitle>
            <CardDescription>Core metadata for your show.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="My Awesome Show"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                placeholder="A short tagline"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell us about the show"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Categories *</Label>
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-full justify-between"
                  >
                    {formData.selectedCategoryIds.length > 0
                      ? `${formData.selectedCategoryIds.length} category(ies) selected`
                      : "Select categories..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandList>
                      <CommandEmpty>No categories found.</CommandEmpty>
                      <CommandGroup>
                        {allCategories.map((cat) => (
                          <CommandItem
                            key={cat.id}
                            value={cat.id}
                            onSelect={() => toggleCategory(cat.id)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{cat.name}</span>
                              {formData.selectedCategoryIds.includes(cat.id) && (
                                <Check className="h-4 w-4" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.selectedCategoryIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.selectedCategoryIds.map((catId) => {
                    const cat = allCategories.find((c) => c.id === catId);
                    return cat ? (
                      <Badge key={catId} variant="secondary">
                        {cat.name}
                        <button
                          type="button"
                          onClick={() => toggleCategory(catId)}
                          className="ml-2 hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="genres">Genres</Label>
                <Input
                  id="genres"
                  placeholder="Drama, Comedy, Action"
                  value={formData.genres}
                  onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="languages">Languages</Label>
                <Input
                  id="languages"
                  placeholder="English, Hindi"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Episode Settings</CardTitle>
            </div>
            <CardDescription>Configure how your video is split into episodes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
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
                <Switch id="lockEpisodes" checked={formData.lockEpisodes} onCheckedChange={(checked) => setFormData({ ...formData, lockEpisodes: checked })} />
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
            <CardDescription>Add thumbnail for your show.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <Label>Thumbnail</Label>
              <Tabs value={thumbnailMode} onValueChange={setThumbnailMode}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <Link2 className="w-4 h-4 mr-2" /> URL
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" /> Upload File
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="mt-4 space-y-4">
                  <Input
                    placeholder="https://example.com/thumbnail.jpg"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  />
                  {formData.thumbnail && (
                    <img
                      src={getImageUrl(formData.thumbnail)}
                      alt="Thumbnail preview"
                      className="h-40 w-28 rounded-md object-cover border border-border"
                    />
                  )}
                </TabsContent>
                <TabsContent value="upload" className="mt-4 space-y-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  />
                  {thumbnailFile && (
                    <div className="flex items-center gap-3">
                      <img
                        src={URL.createObjectURL(thumbnailFile)}
                        alt="Thumbnail preview"
                        className="h-40 w-28 rounded-md object-cover border border-border"
                      />
                      <Button variant="ghost" size="icon" type="button" onClick={() => setThumbnailFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Video</CardTitle>
            </div>
            <CardDescription>Upload your show video to split into episodes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <Label>Video File *</Label>
              <Tabs value={videoMode} onValueChange={setVideoMode}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <Link2 className="w-4 h-4 mr-2" /> URL
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" /> Upload File
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="mt-4 space-y-4">
                  <Input
                    placeholder="https://example.com/video.mp4"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-4 space-y-4">
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
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

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
          <Button type="button" variant="ghost" onClick={() => setLocation(`/categories/${categoryId}/shows`)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || isUploading || formData.selectedCategoryIds.length === 0}
          >
            Create Show
          </Button>
        </div>
      </form>
    </div>
  );
}
