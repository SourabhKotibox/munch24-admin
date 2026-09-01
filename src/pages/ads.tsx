import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Edit2, Trash2, Search, Plus, Activity, TrendingUp, CheckCircle2,
  XCircle, Clock, Play, Image as ImageIcon, Code2, Monitor, Home,
  Film, Eye, MoreVertical, Download,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGetAds, useUpdateAd, useDeleteAd, useBulkDeleteAds, getImageUrl } from "@/lib/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoogleAdsPage from "./google-ads";

type AdRow = {
  _id: string;
  adName: string;
  adType: string;
  placement: string;
  mediaUrl?: string;
  redirectUrl?: string;
  targetContentType?: string;
  startDate: string;
  endDate: string;
  status: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Video: { label: "Video", icon: <Play className="w-3.5 h-3.5" />, color: "text-purple-400 bg-purple-500/15 border-purple-500/30" },
  Image: { label: "Image", icon: <ImageIcon className="w-3.5 h-3.5" />, color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  Custom: { label: "Custom", icon: <Code2 className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
};

const PLACEMENT_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  Player: { label: "Player", icon: <Monitor className="w-3.5 h-3.5" /> },
  "Home Page": { label: "Home Page", icon: <Home className="w-3.5 h-3.5" /> },
  Banner: { label: "Banner", icon: <Film className="w-3.5 h-3.5" /> },
};

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
      isActive ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-zinc-500/15 border-zinc-500/30 text-foreground/70"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-zinc-500"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function isExpired(endDate: string) {
  return new Date(endDate) < new Date();
}

export default function AdsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPlacement, setFilterPlacement] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: adsData, isLoading } = useGetAds();
  const deleteMutation = useDeleteAd();
  const updateMutation = useUpdateAd();
  const bulkDeleteMutation = useBulkDeleteAds();

  const ads: AdRow[] = adsData?.data || [];

  const filtered = ads.filter(ad => {
    const matchSearch = !search || ad.adName.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || ad.adType === filterType;
    const matchPlacement = filterPlacement === "all" || ad.placement === filterPlacement;
    const matchStatus = filterStatus === "all" ||
      (filterStatus === "active" && ad.status === "active") ||
      (filterStatus === "inactive" && ad.status === "inactive") ||
      (filterStatus === "expired" && isExpired(ad.endDate));
    return matchSearch && matchType && matchPlacement && matchStatus;
  });

  const stats = {
    total: ads.length,
    active: ads.filter(a => a.status === "active" && !isExpired(a.endDate)).length,
    inactive: ads.filter(a => a.status === "inactive").length,
    expired: ads.filter(a => isExpired(a.endDate)).length,
  };

  const handleToggleStatus = async (ad: AdRow) => {
    try {
      const newStatus = ad.status === "active" ? "inactive" : "active";
      await updateMutation.mutateAsync({ id: ad._id, data: { status: newStatus } });
      toast({ title: `Ad ${newStatus === "active" ? "activated" : "deactivated"}` });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeletingId(confirmDelete._id);
      await deleteMutation.mutateAsync(confirmDelete._id);
      toast({ title: "Ad deleted successfully" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} selected ads?`)) return;
    try {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      toast({ title: `${selectedIds.length} ads deleted` });
      setSelectedIds([]);
    } catch {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (!ads.length) return toast({ title: "No data to export", variant: "destructive" });
    const headers = ["Ad Name", "Ad Type", "Placement", "Target Content Type", "Start Date", "End Date", "Status"];
    const csv = [
      headers.join(","),
      ...ads.map(ad => [
        `"${ad.adName}"`, `"${ad.adType}"`, `"${ad.placement}"`,
        `"${ad.targetContentType || ''}"`,
        `"${new Date(ad.startDate).toISOString().split("T")[0]}"`,
        `"${new Date(ad.endDate).toISOString().split("T")[0]}"`,
        `"${ad.status}"`,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ads_export.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 -m-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Dashboard</span><span>/</span><span className="text-foreground">Ads Management</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Ads Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your custom ad campaigns and Google Ads</p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="bg-card border border-border h-auto p-1 grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="manual" className="py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">Manual Ads</TabsTrigger>
          <TabsTrigger value="google" className="py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Google Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6 m-0 border-none p-0 outline-none">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setLocation("/ads/new")}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Custom Ad
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Ads", value: stats.total, icon: <Activity className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Active", value: stats.active, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Inactive", value: stats.inactive, icon: <XCircle className="w-5 h-5" />, color: "text-foreground/70", bg: "bg-zinc-500/10 border-zinc-500/20" },
          { label: "Expired", value: stats.expired, icon: <Clock className="w-5 h-5" />, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-5 flex items-center gap-4 ${s.bg}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{s.value}</p>
              <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ads..."
            className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 bg-muted border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring"
        >
          <option value="all">All Types</option>
          <option value="Video">Video</option>
          <option value="Image">Image</option>
          <option value="Custom">Custom</option>
        </select>

        <select
          value={filterPlacement}
          onChange={e => setFilterPlacement(e.target.value)}
          className="px-3 py-2.5 bg-muted border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring"
        >
          <option value="all">All Placements</option>
          <option value="Player">Player</option>
          <option value="Home Page">Home Page</option>
          <option value="Banner">Banner</option>
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-muted border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-ring"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>

        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600/20 border border-rose-600/30 text-rose-400 text-sm font-bold rounded-xl hover:bg-rose-600/30 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Delete {selectedIds.length}
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-muted border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-accent transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        {/* Table header */}
        <div className="grid items-center gap-3 px-5 py-3 border-b border-border bg-muted/50"
          style={{ gridTemplateColumns: "40px 2fr 1fr 1fr 1fr 1fr 1fr 100px" }}>
          <input
            type="checkbox"
            className="rounded border-border bg-muted accent-primary"
            checked={filtered.length > 0 && selectedIds.length === filtered.length}
            onChange={e => setSelectedIds(e.target.checked ? filtered.map(a => a._id) : [])}
          />
          {["Ad Name", "Type", "Placement", "Target", "Schedule", "Status", "Actions"].map(h => (
            <span key={h} className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground text-sm">Loading ads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-bold text-lg">No ads found</p>
              <p className="text-muted-foreground text-sm mt-1">
                {search || filterType !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first ad campaign to get started"}
              </p>
            </div>
            {!search && filterType === "all" && filterStatus === "all" && (
              <button
                onClick={() => setLocation("/ads/new")}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Create First Ad
              </button>
            )}
          </div>
        ) : (
          filtered.map((ad, i) => {
            const tc = TYPE_CONFIG[ad.adType] || TYPE_CONFIG.Custom;
            const pc = PLACEMENT_CONFIG[ad.placement];
            const expired = isExpired(ad.endDate);
            const startFmt = fmt(ad.startDate);
            const endFmt = fmt(ad.endDate);

            return (
              <div
                key={ad._id}
                className={`grid items-center gap-3 px-5 py-4 border-b border-border/60 hover:bg-muted/40 transition-colors group ${
                  i === filtered.length - 1 ? "border-b-0" : ""
                }`}
                style={{ gridTemplateColumns: "40px 2fr 1fr 1fr 1fr 1fr 1fr 100px" }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  className="rounded border-border bg-muted accent-primary"
                  checked={selectedIds.includes(ad._id)}
                  onChange={() => setSelectedIds(prev => prev.includes(ad._id) ? prev.filter(i => i !== ad._id) : [...prev, ad._id])}
                />

                {/* Ad Name + preview */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-9 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                    {ad.mediaUrl && ad.adType === "Image" ? (
                      <img src={getImageUrl(ad.mediaUrl)} alt={ad.adName} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : ad.adType === "Video" ? (
                      <div className="w-full h-full bg-purple-900/40 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-amber-900/30 flex items-center justify-center">
                        <Code2 className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-semibold text-sm truncate">{ad.adName}</p>
                    {ad.redirectUrl && (
                      <p className="text-muted-foreground text-xs truncate max-w-[140px]">{ad.redirectUrl}</p>
                    )}
                  </div>
                </div>

                {/* Type */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border w-fit ${tc.color}`}>
                  {tc.icon} {tc.label}
                </span>

                {/* Placement */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-border bg-muted text-muted-foreground w-fit">
                  {pc?.icon} {pc?.label || ad.placement}
                </span>

                {/* Target */}
                <span className="text-muted-foreground text-sm truncate">{ad.targetContentType || "—"}</span>

                {/* Schedule */}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p className="flex items-center gap-1"><span className="text-muted-foreground/60">From</span> {startFmt}</p>
                  <p className={`flex items-center gap-1 ${expired ? "text-rose-400" : ""}`}>
                    <span className="text-muted-foreground/60">To</span> {endFmt}
                    {expired && <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/30 rounded text-rose-400 font-bold ml-1">Expired</span>}
                  </p>
                </div>

                {/* Status toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ad.status === "active"}
                    onCheckedChange={() => handleToggleStatus(ad)}
                    disabled={updateMutation.isPending}
                    className="data-[state=checked]:bg-primary"
                  />
                  <StatusBadge status={ad.status} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setLocation(`/ads/${ad._id}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(ad)}
                    disabled={deletingId === ad._id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-muted/40 flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Showing <span className="text-foreground font-semibold">{filtered.length}</span> of <span className="text-foreground font-semibold">{ads.length}</span> ads
            </p>
            {selectedIds.length > 0 && (
              <p className="text-muted-foreground text-xs"><span className="text-primary font-bold">{selectedIds.length}</span> selected</p>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Ad</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete <span className="text-foreground font-semibold">"{confirmDelete?.adName}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-accent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-foreground border-0">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        <TabsContent value="google" className="m-0 border-none p-0 outline-none">
          <div className="-mx-6 -mt-6">
            <GoogleAdsPage />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
