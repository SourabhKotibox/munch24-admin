import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGetCrewById, useCreateCrew, useUpdateCrew, getImageUrl } from "../lib/api-client";
import MediaPicker from "@/components/MediaPicker";

const inputCls = "bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary h-11 rounded-lg";
const labelCls = "text-foreground text-sm font-medium";

export default function CrewFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();

  const isEdit = !!params.id && params.id !== "new";
  const { data: crewData } = useGetCrewById(isEdit ? params.id! : "");
  const createCrew = useCreateCrew();
  const updateCrew = useUpdateCrew();

  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [status, setStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    if (crewData?.data) {
      const d = crewData.data;
      setName(d.name || "");
      setDesignation(d.designation || "");
      setImage(d.image || "");
      setImagePreview(d.image ? getImageUrl(d.image) : "");
      setStatus(d.status !== false);
    }
  }, [crewData]);

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!designation.trim()) { toast({ title: "Designation is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), designation: designation.trim(), image: image || undefined, status };
      if (isEdit) {
        await updateCrew.mutateAsync({ id: params.id!, data: payload });
        toast({ title: "Crew member updated successfully!" });
      } else {
        await createCrew.mutateAsync(payload);
        toast({ title: "Crew member created successfully!" });
      }
      setLocation("/crew");
    } catch {
      toast({ title: "Failed to save crew member", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <button onClick={() => setLocation("/crew")} className="text-foreground/65 hover:text-foreground transition-colors">
          Crew
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Crew Member" : "New Crew Member"}</span>
      </div>

      <button
        onClick={() => setLocation("/crew")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors"
      >
        <span className="text-base leading-none">«</span> Back
      </button>

      <div className="rounded-xl border border-border bg-card/50 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* Photo */}
          <div className="space-y-2">
            <Label className={labelCls}>Photo</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMediaPickerOpen(true)}
              className="w-full aspect-[4/3] border-2 border-dashed p-0 overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-foreground/65">Select from Library</p>
                </div>
              )}
            </Button>
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImagePreview(""); setImage(""); }}
                className="text-sm text-primary hover:text-red-300 transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className={labelCls}>Name <span className="text-primary">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Designation <span className="text-primary">*</span></Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Cinematographer, Writer, Editor"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Status</Label>
              <div className="flex items-center justify-between h-11 px-4 rounded-lg border border-border bg-card">
                <span className="text-sm text-foreground font-medium">Active</span>
                <Switch checked={status} onCheckedChange={setStatus} className="data-[state=checked]:bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold min-w-[100px]"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(media) => {
          setImage(media.filePath);
          setImagePreview(getImageUrl(media.filePath));
        }}
        source="crew"
        accept="image/*"
      />
    </div>
  );
}
