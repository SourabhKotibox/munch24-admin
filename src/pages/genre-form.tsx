import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGetGenreById, useCreateGenre, useUpdateGenre, getImageUrl } from "@/lib/api-client";
import MediaPicker from "@/components/MediaPicker";

export default function GenreFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!params.id && params.id !== "new";
  const { data: genreData, isLoading } = useGetGenreById(params.id || "");
  const createGenre = useCreateGenre();
  const updateGenre = useUpdateGenre();

  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    if (genreData?.data && isEdit) {
      setName(genreData.data.name);
      setActive(genreData.data.active);
      setImage(genreData.data.image || "");
      if (genreData.data.image) {
        setImagePreview(getImageUrl(genreData.data.image));
      }
    }
  }, [genreData, isEdit]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('active', active.toString());
      if (image) {
        formData.append('image', image);
      }

      if (isEdit) {
        await updateGenre.mutateAsync({
  id: params.id!,
  data: formData,
});
        toast({ title: "Genre updated successfully!" });
      } else {
        await createGenre.mutateAsync(formData);
        toast({ title: "Genre created successfully!" });
      }
      setLocation("/genres");
    } catch (error) {
      toast({ title: "Failed to save genre", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Genre" : "New Genre"}</span>
      </div>

      {/* Back */}
      <button
        onClick={() => setLocation("/genres")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors"
      >
        <span className="text-base leading-none">«</span>
        Back
      </button>

      {/* Form Card */}
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left — Image upload */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Image</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMediaPickerOpen(true)}
              className="w-full h-48 border-2 border-dashed"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 px-6 text-center select-none">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-foreground/65">Select from Library or Upload</p>
                </div>
              )}
            </Button>
            {imagePreview && (
              <button
                type="button"
                onClick={() => {
                  setImage("");
                  setImagePreview(null);
                }}
                className="text-sm text-primary hover:text-red-300"
              >
                Remove image
              </button>
            )}
          </div>

          {/* Right — Name + Status */}
          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="genre-name" className="text-foreground font-medium">
                Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="genre-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Action Movie"
                className="bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-11 rounded-lg"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Status</Label>
              <div className="flex items-center justify-between h-11 px-4 rounded-lg border border-border bg-card">
                <span className="text-sm text-foreground font-medium">Active</span>
                <Switch
                  checked={active}
                  onCheckedChange={setActive}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save button — bottom right */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-8 rounded-lg font-semibold min-w-[100px]"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Media Picker */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(media) => {
          setImage(media.filePath);
          setImagePreview(getImageUrl(media.filePath));
        }}
        source="genre"
        accept="image/*"
      />
    </div>
  );
}
