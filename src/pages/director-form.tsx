
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGetDirectorById, useCreateDirector, useUpdateDirector, getImageUrl } from "../lib/api-client";
import MediaPicker from "@/components/MediaPicker";

type DirectorData = {
  name: string;
  designation: string;
  dateOfBirth: string;
  birthPlace: string;
  status: boolean;
  image: string;
};

const inputCls = "bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary h-11 rounded-lg";
const labelCls = "text-foreground text-sm font-medium";

export default function DirectorFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!params.id && params.id !== "new";
  const { data: directorData, isLoading } = useGetDirectorById(params.id || "");
  const createDirector = useCreateDirector();
  const updateDirector = useUpdateDirector();

  const [form, setForm] = useState<DirectorData>({
    name: directorData?.data?.name ?? "",
    designation: directorData?.data?.designation ?? "",
    dateOfBirth: directorData?.data?.dateOfBirth?.split('T')[0] ?? "",
    birthPlace: directorData?.data?.birthPlace ?? "",
    status: directorData?.data?.status ?? true,
    image: directorData?.data?.image ?? "",
  });
  const [imagePreview, setImagePreview] = useState<string>(directorData?.data?.image ? getImageUrl(directorData.data.image) : "");
  const [saving, setSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Update form when director data loads
  useEffect(() => {
    if (directorData?.data) {
      setForm({
        name: directorData.data.name,
        designation: directorData.data.designation,
        dateOfBirth: directorData.data.dateOfBirth?.split('T')[0] ?? "",
        birthPlace: directorData.data.birthPlace,
        status: directorData.data.status,
        image: directorData.data.image,
      });
      setImagePreview(directorData.data.image ? getImageUrl(directorData.data.image) : "");
    }
  }, [directorData]);

  const set = <K extends keyof DirectorData>(key: K, value: DirectorData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));


  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!form.dateOfBirth) { toast({ title: "Date of birth is required", variant: "destructive" }); return; }
    if (!form.birthPlace.trim()) { toast({ title: "Birth place is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('designation', form.designation);
      formData.append('dateOfBirth', form.dateOfBirth);
      formData.append('birthPlace', form.birthPlace);
      formData.append('status', form.status.toString());
      if (form.image) {
        formData.append('image', form.image);
      }

      if (isEdit) {
        await updateDirector.mutateAsync({ id: params.id!, formData });
        toast({ title: "Director updated successfully!" });
      } else {
        await createDirector.mutateAsync(formData);
        toast({ title: "Director created successfully!" });
      }
      setLocation("/directors");
    } catch {
      toast({ title: isEdit ? "Failed to update director" : "Failed to create director", variant: "destructive" });
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
        <span className="text-foreground font-medium">{isEdit ? "Edit Director" : "New Director"}</span>
      </div>

      {/* Back */}
      <button
        onClick={() => setLocation("/directors")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors"
      >
        <span className="text-base leading-none">«</span>
        Back
      </button>

      {/* Form Card */}
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className={labelCls}>Photo</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMediaPickerOpen(true)}
              className="w-full aspect-[4/3] border-2 border-dashed"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-foreground/65">Select from Library or Upload</p>
                </div>
              )}
            </Button>
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImagePreview(""); set("image", ""); }}
                className="text-sm text-primary hover:text-red-300"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className={labelCls}>Name <span className="text-primary">*</span></Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Henry Williams" className={inputCls} />
            </div>

            {/* Date Of Birth */}
            <div className="space-y-2">
              <Label className={labelCls}>Date Of Birth <span className="text-primary">*</span></Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} placeholder="e.g. 1994-07-24" className={inputCls} />
            </div>

            {/* Designation */}
            <div className="space-y-2">
              <Label className={labelCls}>Designation</Label>
              <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. director" className={inputCls} />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className={labelCls}>Status</Label>
              <div className="flex items-center justify-between h-11 px-4 rounded-lg border border-border bg-card">
                <span className="text-sm text-foreground font-medium">Active</span>
                <Switch checked={form.status} onCheckedChange={(v) => set("status", v)} className="data-[state=checked]:bg-primary" />
              </div>
            </div>

            {/* Birth Place */}
            <div className="space-y-2 md:col-span-2">
              <Label className={labelCls}>Birth Place <span className="text-primary">*</span></Label>
              <Input value={form.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} placeholder="e.g. New York, USA" className={inputCls} />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold min-w-[100px]">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Media Picker */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(media) => {
          set("image", media.filePath);
          setImagePreview(getImageUrl(media.filePath));
        }}
        source="director"
        accept="image/*"
      />
    </div>
  );
}
