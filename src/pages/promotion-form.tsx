
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  X,
  Upload,
  Link2,
  ChevronLeft,
  Check,
  ChevronsUpDown,
  FolderOpen,
} from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useGetPromotionById,
  useCreatePromotion,
  useUpdatePromotion,
  getImageUrl,
} from "../lib/api-client";
import * as Icons from "lucide-react";

const ALL_ICONS = [
  "Home",
  "User",
  "Settings",
  "Plus",
  "Trash2",
  "Edit",
  "Search",
  "Bell",
  "Heart",
  "Star",
  "CheckCircle",
  "X",
  "ChevronLeft",
  "ChevronRight",
  "MoreVertical",
  "Copy",
  "Check",
  "Lock",
  "Play",
  "Film",
  "Music",
  "Book",
  "Download",
  "Share",
  "Mail",
  "Phone",
  "MapPin",
  "Calendar",
  "Clock",
  "Bookmark",
  "CreditCard",
  "Globe",
  "Palette",
  "Camera",
  "Mic",
  "MessageCircle",
  "Users",
  "LayoutDashboard",
  "Save",
  "Send",
  "AlertCircle",
  "Info",
  "HelpCircle",
  "ExternalLink",
  "Link2",
  "Upload",
  "Eye",
  "ArrowRight",
  "Menu",
  "LogOut",
  "Moon",
  "Sun",
  "Image",
];

function IconSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const IconComponent = Icons[value] || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? (
            <span className="flex items-center gap-2">
              {IconComponent && <IconComponent className="w-4 h-4" />}
              {value}
            </span>
          ) : (
            "Select icon..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search icon..." />
          <CommandEmpty>No icon found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {ALL_ICONS.map((iconName) => {
              const Icon = Icons[iconName];
              return (
                <CommandItem
                  key={iconName}
                  value={iconName}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === iconName ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon className="w-4 h-4 mr-2" />
                  {iconName}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function PromotionForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const isEdit = !!id;

  const { data: promotionData } = useGetPromotionById(id || "");
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const uploadStartRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    videoUrl: "",
    thumbnailUrl: "",
    buttonText: "",
    secondaryButtonText: "",
    isActive: true,
    order: 0,
  });

  const [features, setFeatures] = useState([
    { icon: "", title: "", description: "" },
  ]);

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailMode, setThumbnailMode] = useState("url");
  const [videoMode, setVideoMode] = useState("url");
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);

  useEffect(() => {
    if (isEdit && promotionData) {
      const promo = promotionData;
      setFormData({
        title: promo.title || "",
        subtitle: promo.subtitle || "",
        videoUrl: promo.videoUrl || "",
        thumbnailUrl: promo.thumbnailUrl || "",
        buttonText: promo.buttonText || "",
        secondaryButtonText: promo.secondaryButtonText || "",
        isActive: promo.isActive ?? true,
        order: promo.order ?? 0,
      });
      setFeatures(
        promo.features?.length
          ? promo.features
          : [{ icon: "", title: "", description: "" }]
      );
      setThumbnailMode(
        promo.thumbnailUrl && !promo.thumbnailUrl.startsWith("/uploads/")
          ? "url"
          : "upload"
      );
      setVideoMode(
        promo.videoUrl && !promo.videoUrl.startsWith("/uploads/")
          ? "url"
          : "upload"
      );
    }
  }, [isEdit, promotionData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadSpeed("");
      uploadStartRef.current = null;
      
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("subtitle", formData.subtitle);
      if (thumbnailMode === "url") {
        formDataToSend.append("thumbnailUrl", formData.thumbnailUrl);
      } else if (thumbnailFile) {
        formDataToSend.append("thumbnailFile", thumbnailFile);
      }
      if (videoMode === "url") {
        formDataToSend.append("videoUrl", formData.videoUrl);
      } else if (videoFile) {
        formDataToSend.append("videoFile", videoFile);
      }
      formDataToSend.append("buttonText", formData.buttonText);
      if (formData.secondaryButtonText) {
        formDataToSend.append("secondaryButtonText", formData.secondaryButtonText);
      }
      formDataToSend.append("isActive", formData.isActive.toString());
      formDataToSend.append("order", formData.order.toString());

      features.forEach((feature, index) => {
        formDataToSend.append(`features[${index}][icon]`, feature.icon);
        formDataToSend.append(`features[${index}][title]`, feature.title);
        formDataToSend.append(`features[${index}][description]`, feature.description);
      });

      const onUploadProgress = (progress) => {
        if (!uploadStartRef.current) {
          uploadStartRef.current = Date.now();
        }

        const percentage = Math.round((progress.loaded / progress.total) * 100);
        const elapsedSeconds = (Date.now() - uploadStartRef.current) / 1000;
        const bytesPerSecond = elapsedSeconds > 0 ? progress.loaded / elapsedSeconds : 0;

        setUploadProgress(percentage);
        setUploadSpeed(formatUploadSpeed(bytesPerSecond));
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id, data: formDataToSend, onUploadProgress });
        toast({ title: "Promotion updated successfully!" });
      } else {
        await createMutation.mutateAsync({ data: formDataToSend, onUploadProgress });
        toast({ title: "Promotion created successfully!" });
      }

      queryClient.invalidateQueries({ queryKey: ["promotions-list"] });
      setLocation("/promotions");
    } catch (error) {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadSpeed("");
      uploadStartRef.current = null;
    }
  };

  const formatUploadSpeed = (bytesPerSecond) => {
    if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "";
    const megabytesPerSecond = bytesPerSecond / (1024 * 1024);
    if (megabytesPerSecond >= 1) {
      return `${megabytesPerSecond.toFixed(1)} MB/s`;
    }
    return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  };

  const removeFeature = (index) => {
    if (features.length > 1) {
      setFeatures(features.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <button
          onClick={() => setLocation("/promotions")}
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          Promotions
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Promotion" : "New Promotion"}</span>
      </div>
      <div className="max-w-3xl">

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enjoy Story TV for FREE"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonText">Button Text</Label>
            <Input
              id="buttonText"
              placeholder="Start Trial"
              value={formData.buttonText}
              onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Textarea
            id="subtitle"
            placeholder="5 Crore+ people bought the trial offer till now!"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            required
          />
        </div>

        <div className="space-y-4">
          <Label>Thumbnail</Label>
          <Tabs value={thumbnailMode} onValueChange={(val) => setThumbnailMode(val)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">
                <Link2 className="w-4 h-4 mr-2" /> URL
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="w-4 h-4 mr-2" /> Upload File
              </TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/thumbnail.jpg"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setThumbnailPickerOpen(true)}
                  className="shrink-0"
                >
                  <FolderOpen className="w-4 h-4 mr-2" /> Choose File
                </Button>
              </div>
              {formData.thumbnailUrl && (
                <div className="mt-2">
                  <img
                    src={getImageUrl(formData.thumbnailUrl)}
                    alt="Thumbnail Preview"
                    className="max-h-40 rounded object-cover"
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="upload" className="mt-4 space-y-4">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setThumbnailFile(
                    e.target.files && e.target.files[0] ? e.target.files[0] : null
                  )
                }
              />
              {thumbnailFile && (
                <div className="flex items-center gap-2">
                  <img
                    src={URL.createObjectURL(thumbnailFile)}
                    alt="Thumbnail Preview"
                    className="max-h-40 rounded object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setThumbnailFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {isEdit && promotionData?.thumbnailUrl && !thumbnailFile && (
                <div className="mt-2">
                  <img
                    src={getImageUrl(promotionData.thumbnailUrl)}
                    alt="Current Thumbnail"
                    className="max-h-40 rounded object-cover"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Label>Video <span className="text-muted-foreground">(Max 4 minutes)</span></Label>
          <Tabs value={videoMode} onValueChange={(val) => setVideoMode(val)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">
                <Link2 className="w-4 h-4 mr-2" /> URL
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="w-4 h-4 mr-2" /> Upload File
              </TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/video.mp4"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVideoPickerOpen(true)}
                  className="shrink-0"
                >
                  <FolderOpen className="w-4 h-4 mr-2" /> Choose File
                </Button>
              </div>
              {formData.videoUrl && (
                <div className="mt-2">
                  <video
                    src={getImageUrl(formData.videoUrl)}
                    controls
                    className="max-h-40 rounded"
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="upload" className="mt-4 space-y-4">
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = function() {
                      window.URL.revokeObjectURL(video.src);
                      if (video.duration > 240) { // 4 minutes = 240 seconds
                        toast({ title: "Video too long", description: "Video must be 4 minutes or less", variant: "destructive" });
                        e.target.value = '';
                      } else {
                        setVideoFile(file);
                      }
                    };
                    video.src = URL.createObjectURL(file);
                  }
                }}
              />
              {videoFile && (
                <div className="flex items-center gap-2">
                  <video
                    src={URL.createObjectURL(videoFile)}
                    controls
                    className="max-h-40 rounded"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setVideoFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {isEdit && promotionData?.videoUrl && !videoFile && (
                <div className="mt-2">
                  <video
                    src={getImageUrl(promotionData.videoUrl)}
                    controls
                    className="max-h-40 rounded"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Features</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setFeatures([...features, { icon: "", title: "", description: "" }])
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </div>
          {features.map((feature, index) => (
            <div
              key={index}
              className="space-y-3 p-4 border border-border rounded-xl bg-muted/50"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">Feature {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature(index)}
                  disabled={features.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`feature-${index}-icon`}>Icon</Label>
                  <IconSelector
                    value={feature.icon}
                    onChange={(newIcon) =>
                      setFeatures(
                        features.map((f, i) =>
                          i === index ? { ...f, icon: newIcon } : f
                        )
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`feature-${index}-title`}>Title</Label>
                  <Input
                    id={`feature-${index}-title`}
                    placeholder="Start trial"
                    value={feature.title}
                    onChange={(e) =>
                      setFeatures(
                        features.map((f, i) =>
                          i === index ? { ...f, title: e.target.value } : f
                        )
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`feature-${index}-description`}>Description</Label>
                <Input
                  id={`feature-${index}-description`}
                  placeholder="Unlock all dramas"
                  value={feature.description}
                  onChange={(e) =>
                    setFeatures(
                      features.map((f, i) =>
                        i === index ? { ...f, description: e.target.value } : f
                      )
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryButtonText">Secondary Button Text (Optional)</Label>
          <Input
            id="secondaryButtonText"
            placeholder="Restore Purchase"
            value={formData.secondaryButtonText}
            onChange={(e) => setFormData({ ...formData, secondaryButtonText: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="order">Order</Label>
            <Input
              type="number"
              id="order"
              placeholder="0"
              value={formData.order}
              onChange={(e) =>
                setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isActive">Active</Label>
            <select
              id="isActive"
              value={formData.isActive ? "true" : "false"}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.value === "true" })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

      {/* Upload Progress Bar */}
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

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/promotions")}
            className="bg-muted border-border text-foreground hover:bg-muted px-6 h-11"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending || isUploading}
            className="bg-primary hover:bg-primary/90 text-white px-6 h-11 font-semibold"
          >
            {isEdit ? "Update Promotion" : "Create Promotion"}
          </Button>
        </div>
      </form>
      </div>

      <MediaPicker
        open={thumbnailPickerOpen}
        onClose={() => setThumbnailPickerOpen(false)}
        onSelect={(media) => {
          setFormData({ ...formData, thumbnailUrl: media.filePath || media.url });
          setThumbnailPickerOpen(false);
        }}
        source="promotion"
        accept="image/*"
      />

      <MediaPicker
        open={videoPickerOpen}
        onClose={() => setVideoPickerOpen(false)}
        onSelect={(media) => {
          setFormData({ ...formData, videoUrl: media.filePath || media.url });
          setVideoPickerOpen(false);
        }}
        source="promotion"
        accept="video/*"
      />
    </div>
  );
}
