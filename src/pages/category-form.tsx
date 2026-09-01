import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGetCategoryById, useCreateCategory, useUpdateCategory, getImageUrl } from "../lib/api-client";
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
import { Check, ChevronDown, ArrowLeft, Play, Music, Video, Book, Gamepad2, Smile, Star, Heart, Zap, Flame, TrendingUp, TrendingDown, Newspaper, ShoppingBag, Users, User, Shield, Bell, AlertCircle, CheckCircle2, XCircle, Info, HelpCircle, Clock, Calendar, Home, Settings, Sliders, Edit3, Trash2, MoreHorizontal, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = [
  { name: "Play", value: "Play", icon: Play },
  { name: "Music", value: "Music", icon: Music },
  { name: "Video", value: "Video", icon: Video },
  { name: "Book", value: "Book", icon: Book },
  { name: "Gamepad2", value: "Gamepad2", icon: Gamepad2 },
  { name: "Smile", value: "Smile", icon: Smile },
  { name: "Star", value: "Star", icon: Star },
  { name: "Heart", value: "Heart", icon: Heart },
  { name: "Zap", value: "Zap", icon: Zap },
  { name: "Flame", value: "Flame", icon: Flame },
  { name: "TrendingUp", value: "TrendingUp", icon: TrendingUp },
  { name: "TrendingDown", value: "TrendingDown", icon: TrendingDown },
  { name: "Newspaper", value: "Newspaper", icon: Newspaper },
  { name: "ShoppingBag", value: "ShoppingBag", icon: ShoppingBag },
  { name: "Users", value: "Users", icon: Users },
  { name: "User", value: "User", icon: User },
  { name: "Shield", value: "Shield", icon: Shield },
  { name: "Bell", value: "Bell", icon: Bell },
  { name: "AlertCircle", value: "AlertCircle", icon: AlertCircle },
  { name: "CheckCircle2", value: "CheckCircle2", icon: CheckCircle2 },
  { name: "XCircle", value: "XCircle", icon: XCircle },
  { name: "Info", value: "Info", icon: Info },
  { name: "HelpCircle", value: "HelpCircle", icon: HelpCircle },
  { name: "Clock", value: "Clock", icon: Clock },
  { name: "Calendar", value: "Calendar", icon: Calendar },
  { name: "Home", value: "Home", icon: Home },
  { name: "Settings", value: "Settings", icon: Settings },
  { name: "Sliders", value: "Sliders", icon: Sliders },
  { name: "Edit3", value: "Edit3", icon: Edit3 },
  { name: "Trash2", value: "Trash2", icon: Trash2 },
  { name: "MoreHorizontal", value: "MoreHorizontal", icon: MoreHorizontal },
];

type FormDataState = {
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  bannerImage: string;
  icon: string;
  color: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
};

export default function CategoryForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const isEdit = !!id;

  const { data: categoryData } = useGetCategoryById(id || "");
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const thumbnailRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);

  const [formData, setFormData] = useState<FormDataState>({
    name: "",
    slug: "",
    description: "",
    thumbnail: "",
    bannerImage: "",
    icon: "",
    color: "#e50914",
    isActive: true,
    isFeatured: false,
    order: 0,
  });

  useEffect(() => {
    console.log("category-form useEffect: isEdit:", isEdit, "categoryData:", categoryData);
    if (isEdit && categoryData) {
      setFormData({
        name: categoryData.name || "",
        slug: categoryData.slug || "",
        description: categoryData.description || "",
        thumbnail: categoryData.thumbnail || "",
        bannerImage: categoryData.bannerImage || "",
        icon: categoryData.icon || "",
        color: categoryData.color || "#e50914",
        isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
        isFeatured: categoryData.isFeatured || false,
        order: categoryData.order || 0,
      });
      if (categoryData.thumbnail) setThumbnailPreview(getImageUrl(categoryData.thumbnail));
      if (categoryData.bannerImage) setBannerPreview(getImageUrl(categoryData.bannerImage));
    }
  }, [isEdit, categoryData]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('slug', formData.slug);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('color', formData.color);
      formDataToSend.append('icon', formData.icon);
      formDataToSend.append('isActive', formData.isActive.toString());
      formDataToSend.append('isFeatured', formData.isFeatured.toString());
      formDataToSend.append('order', formData.order.toString());
      
      // Send thumbnail and banner URLs (from MediaPicker or existing)
      if (formData.thumbnail) {
        formDataToSend.append('thumbnail', formData.thumbnail);
      }
      if (formData.bannerImage) {
        formDataToSend.append('bannerImage', formData.bannerImage);
      }

      console.log("About to send formDataToSend, entries: ", Array.from(formDataToSend.entries()));
      if (isEdit) {
        await updateMutation.mutateAsync({ categoryId: id, data: formDataToSend });
        toast({ title: "Category updated successfully!" });
      } else {
        await createMutation.mutateAsync({ data: formDataToSend });
        toast({ title: "Category created successfully!" });
      }

      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      setLocation("/categories");
    } catch (error) {
      console.error("Error in handleSubmit: ", error);
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const selectedIcon = icons.find(i => i.value === formData.icon);
  const SelectedIconComponent = selectedIcon?.icon || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => setLocation("/categories")}
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span>Dashboard</span>
        <span>/</span>
        <button
          onClick={() => setLocation("/categories")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Categories
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Category" : "New Category"}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Basic Information */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-foreground font-semibold text-base">Basic Information</h3>
            <p className="text-muted-foreground text-sm mt-0.5">Name, slug, and description for the category.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-foreground text-sm">
                Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Category name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  // Auto-generate slug from name
                  if (!isEdit) {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData(prev => ({ ...prev, slug }));
                  }
                }}
                required
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-foreground text-sm">
                Slug
              </Label>
              <Input
                id="slug"
                placeholder="category-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-foreground text-sm">Description</Label>
            <Textarea
              id="description"
              placeholder="A small description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Images */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-foreground font-semibold text-base">Images & Icon</h3>
            <p className="text-muted-foreground text-sm mt-0.5">Thumbnail, banner, and icon for the category.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="thumbnail" className="text-foreground text-sm">Thumbnail</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setThumbnailPickerOpen(true)}
                className="w-full h-32 border-2 border-dashed"
              >
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-sm">Select from Library or Upload</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bannerImage" className="text-foreground text-sm">Banner Image</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBannerPickerOpen(true)}
                className="w-full h-32 border-2 border-dashed"
              >
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-sm">Select from Library or Upload</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="icon" className="text-foreground text-sm">Icon</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-muted border-border text-foreground h-11"
                  >
                    {selectedIcon ? (
                      <div className="flex items-center gap-2">
                        <SelectedIconComponent className="w-4 h-4" />
                        {selectedIcon.name}
                      </div>
                    ) : (
                      "Select an icon..."
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 bg-popover border-border">
                  <Command>
                    <CommandInput placeholder="Search icon..." className="h-9 text-foreground" />
                    <CommandList>
                      <CommandEmpty>No icon found.</CommandEmpty>
                      <CommandGroup>
                        {icons.map((icon) => {
                          const IconComponent = icon.icon;
                          return (
                            <CommandItem
                              key={icon.value}
                              value={icon.value}
                              onSelect={(currentValue) => {
                                setFormData({ ...formData, icon: currentValue });
                                setOpen(false);
                              }}
                              className="text-foreground"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.icon === icon.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                {icon.name}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-foreground font-semibold text-base">Display Settings</h3>
            <p className="text-muted-foreground text-sm mt-0.5">Color, order, and visibility settings.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="color" className="text-foreground text-sm">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-11 p-1 bg-muted border-border"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order" className="text-foreground text-sm">Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Status</Label>
              <div className="flex items-center gap-4 h-11">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="isActive" className="text-foreground text-sm cursor-pointer">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="isFeatured" className="text-foreground text-sm cursor-pointer">Featured</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/categories")}
            className="bg-muted border-border text-foreground hover:bg-muted px-6 h-11"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-white px-6 h-11 font-semibold"
          >
            {isEdit ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </form>

      {/* Media Pickers */}
      <MediaPicker
        open={thumbnailPickerOpen}
        onClose={() => setThumbnailPickerOpen(false)}
        onSelect={(media) => {
          setFormData({ ...formData, thumbnail: media.url });
          setThumbnailPreview(getImageUrl(media.url));
        }}
        source="category"
        accept="image/*"
      />
      <MediaPicker
        open={bannerPickerOpen}
        onClose={() => setBannerPickerOpen(false)}
        onSelect={(media) => {
          setFormData({ ...formData, bannerImage: media.url });
          setBannerPreview(getImageUrl(media.url));
        }}
        source="category"
        accept="image/*"
      />
    </div>
  );
}