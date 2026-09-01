import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  ChevronLeft, Play, Image as ImageIcon, Code2, Monitor, Home,
  Film, Globe, HardDrive, Link2, ExternalLink, Calendar, Tag,
  Loader2, Check, Upload, Eye, EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateAd, useUpdateAd, useGetAds, useGetContentList, getImageUrl } from "@/lib/api-client";
import MediaPicker from "@/components/MediaPicker";
import { Switch } from "@/components/ui/switch";

const AD_TYPES = [
  { value: "Video", label: "Video Ad", icon: <Play className="w-5 h-5" />, desc: "MP4 or HLS video pre-roll", color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
  { value: "Image", label: "Image Ad", icon: <ImageIcon className="w-5 h-5" />, desc: "Static banner or interstitial", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
  { value: "Custom", label: "Custom / Script", icon: <Code2 className="w-5 h-5" />, desc: "Google Ads or custom HTML", color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
];

const PLACEMENTS = [
  { value: "Player", label: "Video Player", icon: <Monitor className="w-5 h-5" />, desc: "Pre-roll or mid-roll in player" },
  { value: "Home Page", label: "Home Page", icon: <Home className="w-5 h-5" />, desc: "Shown on the streaming home" },
  { value: "Banner", label: "Banner", icon: <Film className="w-5 h-5" />, desc: "Full-width banner overlay" },
];

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-4 rounded-full bg-primary" />
      <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function AdForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== "new";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: adsData, isLoading: isAdsLoading } = useGetAds();
  const createMutation = useCreateAd();
  const updateMutation = useUpdateAd();

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);

  const [form, setForm] = useState({
    adName: "",
    adType: "Video",
    urlType: "Local",
    mediaUrl: "",
    placement: "Player",
    redirectUrl: "",
    targetContentType: "Movie",
    targetCategories: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
    status: "active",
  });

  useEffect(() => {
    if (isEdit && adsData?.data) {
      const ad = adsData.data.find((a: any) => a._id === id);
      if (ad) {
        setForm({
          adName: ad.adName || "",
          adType: ad.adType || "Video",
          urlType: ad.urlType || "Local",
          mediaUrl: ad.mediaUrl || "",
          placement: ad.placement || "Player",
          redirectUrl: ad.redirectUrl || "",
          targetContentType: ad.targetContentType || "Movie",
          targetCategories: ad.targetCategories?.length ? ad.targetCategories : [],
          startDate: ad.startDate ? new Date(ad.startDate).toISOString().split("T")[0] : "",
          endDate: ad.endDate ? new Date(ad.endDate).toISOString().split("T")[0] : "",
          status: ad.status || "active",
        });
      }
    }
  }, [isEdit, adsData, id]);

  const apiFetchType = form.targetContentType === "TV Shows" ? "TV Show"
    : form.targetContentType === "Short Dramas" ? "Short Drama"
    : form.targetContentType === "Movie" ? "Movie"
    : undefined;

  const { data: contentData } = useGetContentList({ limit: 100, type: apiFetchType });
  const contentOptions = contentData?.data || [];

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.adName.trim()) return toast({ title: "Ad name is required", variant: "destructive" });
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: form });
        toast({ title: "Ad updated successfully" });
      } else {
        await createMutation.mutateAsync(form);
        toast({ title: "Ad created successfully" });
      }
      setLocation("/ads");
    } catch (e: any) {
      toast({ title: "Failed to save ad", description: e.message, variant: "destructive" });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isAdsLoading && isEdit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 -m-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>Dashboard</span><span>/</span>
          <button onClick={() => setLocation("/ads")} className="hover:text-foreground transition-colors">Custom Ads</button>
          <span>/</span>
          <span className="text-foreground">{isEdit ? "Edit Ad" : "New Ad"}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/ads")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">{isEdit ? "Edit Ad Campaign" : "Create New Ad"}</h1>
            <p className="text-muted-foreground text-sm">{isEdit ? "Update your ad settings and creative" : "Set up a new ad campaign"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl">

        {/* ── LEFT COLUMN: Ad Type + Placement ── */}
        <div className="space-y-6">
          {/* Ad Name */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionLabel label="Ad Identity" />
            <label className="block text-sm font-semibold text-muted-foreground mb-2">Ad Name <span className="text-primary">*</span></label>
            <input
              value={form.adName}
              onChange={e => set("adName", e.target.value)}
              placeholder="e.g. Summer Sale Banner"
              className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
            />
          </div>

          {/* Ad Type */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionLabel label="Ad Type" />
            <div className="space-y-3">
              {AD_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => set("adType", t.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    form.adType === t.value
                      ? `${t.color} border-current`
                      : "border-border bg-muted/50 text-muted-foreground hover:border-ring hover:text-foreground"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${form.adType === t.value ? "bg-white/10" : "bg-muted"}`}>
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{t.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{t.desc}</p>
                  </div>
                  {form.adType === t.value && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Placement */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionLabel label="Placement" />
            <div className="space-y-3">
              {PLACEMENTS.map(p => (
                <button
                  key={p.value}
                  onClick={() => set("placement", p.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    form.placement === p.value
                      ? "border-primary bg-primary/10 text-white"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-ring hover:text-foreground"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${form.placement === p.value ? "bg-primary/20" : "bg-muted"}`}>
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{p.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{p.desc}</p>
                  </div>
                  {form.placement === p.value && <Check className="w-4 h-4 ml-auto flex-shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN: Media + URL ── */}
        <div className="space-y-6">
          {/* Media */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel label="Creative / Media" />
              {form.mediaUrl && (
                <button onClick={() => setPreviewVisible(v => !v)} className="flex items-center gap-1.5 text-xs text-foreground/65 hover:text-muted-foreground transition-colors">
                  {previewVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {previewVisible ? "Hide" : "Show"} preview
                </button>
              )}
            </div>

            {/* URL Type */}
            <div className="flex gap-2 mb-4">
              {[{ v: "Local", icon: <HardDrive className="w-3.5 h-3.5" />, label: "Upload File" }, { v: "URL", icon: <Globe className="w-3.5 h-3.5" />, label: "External URL" }].map(o => (
                <button
                  key={o.v}
                  onClick={() => set("urlType", o.v)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    form.urlType === o.v ? "bg-primary/15 border-primary/40 text-white" : "bg-muted border-border text-muted-foreground hover:border-ring"
                  }`}
                >
                  {o.icon} {o.label}
                </button>
              ))}
            </div>

            {/* Media input */}
            {form.urlType === "Local" ? (
              <button
                onClick={() => setIsMediaPickerOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border text-muted-foreground rounded-xl hover:border-ring hover:text-foreground transition-colors text-sm"
              >
                <span className="truncate">{form.mediaUrl ? form.mediaUrl.split("/").pop() : "Choose file from media library..."}</span>
                <Upload className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>
            ) : (
              <input
                value={form.mediaUrl}
                onChange={e => set("mediaUrl", e.target.value)}
                placeholder={form.adType === "Custom" ? "Paste Google/custom ad script..." : "https://cdn.example.com/ad.mp4"}
                className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
              />
            )}

            {/* Preview */}
            {form.mediaUrl && previewVisible && (
              <div className="mt-4 rounded-xl overflow-hidden bg-muted border border-border" style={{ aspectRatio: "16/9" }}>
                {form.adType === "Video" ? (
                  <video src={getImageUrl(form.mediaUrl)} controls className="w-full h-full object-contain" />
                ) : form.adType === "Image" ? (
                  <img src={getImageUrl(form.mediaUrl)} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  /* Custom/Script — render in sandboxed iframe */
                  <div className="w-full h-full flex flex-col">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20">
                      <Code2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-amber-500">Live Ad Preview (sandboxed)</span>
                    </div>
                    <iframe
                      key={form.mediaUrl}
                      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;background:#fff;}</style></head><body>${form.mediaUrl}</body></html>`}
                      sandbox="allow-scripts allow-same-origin"
                      className="w-full flex-1 border-0"
                      title="Ad Preview"
                    />
                  </div>
                )}
              </div>
            )}
            {/* Custom/Script: if no mediaUrl entered yet, show placeholder */}
            {form.adType === "Custom" && !form.mediaUrl && (
              <div className="mt-4 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 p-6 flex flex-col items-center justify-center gap-2 text-center">
                <Code2 className="w-8 h-8 text-amber-400" />
                <p className="text-sm font-semibold text-amber-500">Paste your ad script or HTML above</p>
                <p className="text-xs text-muted-foreground">Supports Google AdSense tags, custom HTML banners, and JavaScript ad scripts. A live preview will appear here.</p>
              </div>
            )}
          </div>

          {/* Redirect URL */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionLabel label="Click Destination" />
            <label className="block text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4 text-muted-foreground" /> Redirect URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={form.redirectUrl}
                onChange={e => set("redirectUrl", e.target.value)}
                placeholder="https://example.com/offer"
                className="w-full pl-10 pr-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
              />
            </div>
            <p className="text-muted-foreground text-xs mt-2">Where users are sent when they click on the ad</p>
          </div>

          {/* Status */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionLabel label="Status" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Ad Active</p>
                <p className="text-muted-foreground text-xs mt-0.5">Toggle to enable or pause this ad</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold ${form.status === "active" ? "text-emerald-400" : "text-foreground/65"}`}>
                  {form.status === "active" ? "Active" : "Inactive"}
                </span>
                <Switch
                  checked={form.status === "active"}
                  onCheckedChange={v => set("status", v ? "active" : "inactive")}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Targeting + Schedule ── */}
        <div className="space-y-6">
          {/* Targeting */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionLabel label="Targeting" />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-muted-foreground" /> Content Type
                </label>
                <select
                  value={form.targetContentType}
                  onChange={e => set("targetContentType", e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring transition-colors"
                >
                  <option value="Movie">Movies</option>
                  <option value="Short Dramas">Short Dramas</option>
                  <option value="TV Shows">TV Shows</option>
                  <option value="All">All Content</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Target Titles
                  <span className="text-muted-foreground font-normal ml-1.5 text-xs">(optional — leave empty to target all)</span>
                </label>

                {/* Tags */}
                {form.targetCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.targetCategories.map((cat, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-primary/15 border border-primary/30 text-primary text-xs font-bold rounded-lg">
                        {cat}
                        <button
                          onClick={() => set("targetCategories", form.targetCategories.filter((_, idx) => idx !== i))}
                          className="hover:text-foreground transition-colors font-black leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <select
                  value=""
                  onChange={e => {
                    const v = e.target.value;
                    if (v && !form.targetCategories.includes(v))
                      set("targetCategories", [...form.targetCategories, v]);
                  }}
                  className="w-full px-4 py-3 bg-background border border-border text-muted-foreground text-sm rounded-xl focus:outline-none focus:border-ring transition-colors"
                >
                  <option value="" disabled>Add target title...</option>
                  {contentOptions.map((item: any) => (
                    <option key={item._id} value={item.title || item.name}>
                      {item.title || item.name}
                    </option>
                  ))}
                  <option value="Global Application">Target All</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionLabel label="Campaign Schedule" />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> Start Date <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => set("startDate", e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> End Date <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => set("endDate", e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring transition-colors"
                />
              </div>
              {form.startDate && form.endDate && (
                <div className="p-3 bg-muted border border-border rounded-xl">
                  <p className="text-muted-foreground text-xs">Campaign duration</p>
                  <p className="text-foreground font-bold text-sm mt-0.5">
                    {Math.max(0, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000))} days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving || !form.adName.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary/90 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Check className="w-4 h-4" /> {isEdit ? "Update Ad" : "Create Ad"}</>
            )}
          </button>
        </div>
      </div>

      <MediaPicker
        open={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(media) => set("mediaUrl", media.url)}
        source="Ads"
      />
    </div>
  );
}
