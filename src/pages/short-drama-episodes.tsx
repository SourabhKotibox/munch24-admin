import { useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Trash2, Search, Plus, ChevronLeft, Upload, Link2, Loader2, X, AlertTriangle, Clock, Film, Edit2, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useGetEpisodeList, useDeleteEpisode, useToggleEpisodeLock,
  useGetContentList, useGetSeasonList, useAppendContentVideo, getImageUrl,
} from "@/lib/api-client";

const MAX_MINUTES = 3;

type EpisodeRow = {
  _id: string; id: string;
  thumbnail: string; title: string;
  episode: number; season: number;
  showName: string; duration?: number;
  isFree: boolean; isLocked: boolean;
  processingStatus: string; contentId: any;
};
type SeasonRow = { seasonId: string; contentId: string; season: number; episodeCount: number; showName: string; thumbnail: string; status: string; };

const fmt = (s?: number) => {
  if (!s || !Number.isFinite(s)) return "—";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ShortDramaEpisodesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialContentId = params.get("contentId") || "";
  const initialSeason = params.get("season") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("action");
  const [confirmDelete, setConfirmDelete] = useState<EpisodeRow | null>(null);

  const { data: episodesData, isLoading } = useGetEpisodeList({
    contentType: "drama",
    ...(initialContentId ? { contentId: initialContentId } : {}),
    ...(initialSeason ? { season: Number(initialSeason) } : {}),
  });
  const deleteMutation = useDeleteEpisode();
  const lockMutation = useToggleEpisodeLock();

  const episodes: EpisodeRow[] = episodesData?.data || [];

  const filtered = episodes.filter((ep) => {
    const matchesSearch = !searchQuery || ep.title?.toLowerCase().includes(searchQuery.toLowerCase()) || ep.showName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && ep.processingStatus === "ready") || (statusFilter === "inactive" && ep.processingStatus !== "ready");
    const matchesAccess = accessFilter === "all" || (accessFilter === "free" && ep.isFree) || (accessFilter === "paid" && !ep.isFree);
    return matchesSearch && matchesStatus && matchesAccess;
  });

  const allSelected = filtered.length > 0 && filtered.every((ep) => selectedIds.includes(ep._id || ep.id));
  const toggleAll = () =>
    allSelected ? setSelectedIds([]) : setSelectedIds(filtered.map((ep) => ep._id || ep.id));
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleToggleLock = async (ep: EpisodeRow) => {
    try {
      await lockMutation.mutateAsync({ id: ep._id || ep.id, isLocked: !ep.isLocked });
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      toast({ title: `Episode ${ep.isLocked ? "unlocked" : "locked"}.` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete._id || confirmDelete.id);
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      queryClient.invalidateQueries({ queryKey: ["season-list"] });
      toast({ title: "Episode deleted successfully!" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleApplyBulk = async () => {
    if (!selectedIds.length) return;
    if (bulkAction === "delete") {
      try {
        await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
        queryClient.invalidateQueries({ queryKey: ["episode-list"] });
        queryClient.invalidateQueries({ queryKey: ["season-list"] });
        toast({ title: `${selectedIds.length} episode(s) deleted.` });
        setSelectedIds([]);
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-5">

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span><span>/</span>
        <span className="text-foreground font-medium">Episodes</span>
        {episodes.length > 0 && (
          <span className="text-foreground/80 text-xs">({episodes.length} total)</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="action">Action</SelectItem>
            <SelectItem value="delete">Delete Selected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleApplyBulk} className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-lg font-semibold text-sm">
          Apply
        </Button>

        <div className="flex-1" />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Ready</SelectItem>
            <SelectItem value="inactive">Processing</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accessFilter} onValueChange={setAccessFilter}>
          <SelectTrigger className="w-32 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue placeholder="Access" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="all">All Access</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search episodes..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm focus:border-primary" />
        </div>

        <Button onClick={() => {
          const queryParams = new URLSearchParams();
          if (initialContentId) queryParams.set("contentId", initialContentId);
          if (initialSeason) queryParams.set("season", initialSeason);
          const qs = queryParams.toString();
          setLocation(`/short-drama-episodes/new${qs ? `?${qs}` : ""}`);
        }}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold text-sm">
          <Plus className="h-4 w-4" /> New Episode
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-card hover:bg-card">
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                </TableHead>
                <TableHead className="text-foreground/80 font-semibold text-xs uppercase tracking-wide min-w-[200px]">Episode</TableHead>
                <TableHead className="text-foreground/80 font-semibold text-xs uppercase tracking-wide">Season</TableHead>
                <TableHead className="text-foreground/80 font-semibold text-xs uppercase tracking-wide">Short Drama</TableHead>
                <TableHead className="text-foreground/80 font-semibold text-xs uppercase tracking-wide">Duration</TableHead>
                <TableHead className="text-foreground/80 font-semibold text-xs uppercase tracking-wide">Access</TableHead>
                <TableHead className="text-foreground/80 font-semibold text-xs uppercase tracking-wide">Locked</TableHead>
                <TableHead className="text-foreground/80 font-semibold text-xs uppercase tracking-wide">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-foreground py-14">
                    {searchQuery ? "No episodes match your search" : "No episodes found. Click New Episode to add one."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ep) => {
                  const epId = ep._id || ep.id;
                  return (
                    <TableRow key={epId} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <Checkbox checked={selectedIds.includes(epId)} onCheckedChange={() => toggleOne(epId)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-20 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                            {ep.thumbnail ? (
                              <img src={getImageUrl(ep.thumbnail)} alt={ep.title} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-foreground/80" />
                            )}
                          </div>
                          <div>
                            <p className="text-foreground font-medium text-sm">{ep.title}</p>
                            <p className="text-xs text-foreground mt-0.5">Ep {ep.episode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground/80 text-sm">Season {ep.season}</span>
                      </TableCell>
                      <TableCell className="text-foreground/80 text-sm">
                        {ep.showName || (ep.contentId as any)?.title || "—"}
                      </TableCell>
                      <TableCell className="text-foreground/80 text-sm">{fmt(ep.duration)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                          ep.isFree ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {ep.isFree ? "Free" : "Paid"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={ep.isLocked}
                          onCheckedChange={() => handleToggleLock(ep)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setLocation(`/short-drama-episodes/${epId}/edit`)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                            title="Edit">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setConfirmDelete(ep)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
                            title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80">
              Are you sure you want to delete "{confirmDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-primary hover:bg-primary/90 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
