import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Edit2, Eye, Search, Plus, ChevronLeft, Upload, Link2, Loader2,
  X, Clock, AlertTriangle, Film, Trash2, ImageIcon, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetSeasonList, useGetContentList, useAppendContentVideo, useGetEpisodeList, useDeleteEpisode, getImageUrl,
} from "@/lib/api-client";

const MAX_MINUTES = 3;

type SeasonRow = {
  seasonId: string;
  contentId: string;
  season: number;
  episodeCount: number;
  showName: string;
  thumbnail: string;
  status: string;
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ShortDramaSeasonsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("action");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deletingSeasonEpisodes, setDeletingSeasonEpisodes] = useState(false);

  const { data: seasonsData, isLoading } = useGetSeasonList({ contentType: "drama" });
  const { data: allEpisodesData } = useGetEpisodeList({ limit: 200 });
  const deleteEpisodeMutation = useDeleteEpisode();

  const seasons: SeasonRow[] = seasonsData?.data || [];

  const filtered = seasons.filter((s) =>
    !searchQuery ||
    s.showName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `season ${s.season}`.includes(searchQuery.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.includes(s.seasonId));
  const toggleAll = () =>
    allSelected ? setSelectedIds([]) : setSelectedIds(filtered.map((s) => s.seasonId));
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleDeleteSeasonEpisodes = async () => {
    if (!confirmDelete) return;
    setDeletingSeasonEpisodes(true);
    try {
      const allEpisodes: any[] = allEpisodesData?.data || [];
      const toDelete = allEpisodes.filter(
        (ep: any) =>
          (typeof ep.contentId === "object" ? ep.contentId?._id?.toString() : ep.contentId?.toString()) === confirmDelete.contentId?.toString() &&
          ep.season === confirmDelete.season
      );
      if (toDelete.length === 0) {
        toast({ title: "No episodes found for this season." });
      } else {
        await Promise.all(toDelete.map((ep: any) => deleteEpisodeMutation.mutateAsync(ep._id)));
        queryClient.invalidateQueries({ queryKey: ["season-list"] });
        queryClient.invalidateQueries({ queryKey: ["episode-list"] });
        toast({ title: `Season ${confirmDelete.season} deleted (${toDelete.length} episodes removed).` });
      }
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingSeasonEpisodes(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-5">

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span><span>/</span>
        <span className="text-foreground font-medium">Seasons</span>
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
        <Button
          onClick={async () => {
            if (bulkAction === "delete" && selectedIds.length > 0) {
              toast({ title: "Please delete seasons individually." });
            }
          }}
          className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-lg font-semibold text-sm"
        >
          Apply
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Short Dramas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm focus:border-primary"
          />
        </div>

        <Button
          onClick={() => setLocation("/short-drama-seasons/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold text-sm"
        >
          <Plus className="h-4 w-4" /> New Season
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
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide min-w-[220px]">Season</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Short Drama</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Episodes</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-foreground/65 py-14">
                    {searchQuery ? "No seasons match your search" : "No seasons yet. Click New Season to create one."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((season) => (
                  <TableRow key={season.seasonId} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(season.seasonId)} onCheckedChange={() => toggleOne(season.seasonId)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                          {season.thumbnail ? (
                            <img src={getImageUrl(season.thumbnail)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground/80" />
                          )}
                        </div>
                        <div>
                          <p className="text-foreground font-medium text-sm">Season {season.season}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground/70 text-sm">{season.showName || "—"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                        <Video className="h-3 w-3" />
                        {season.episodeCount} Episodes
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        season.status === "published" ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-foreground/70"
                      }`}>
                        {season.status === "published" ? "Active" : "Draft"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setLocation(`/short-drama-episodes?contentId=${season.contentId}&season=${season.season}`)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                          title="View Episodes"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(season)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
                          title="Delete Season"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season {confirmDelete?.season}</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              This will delete all {confirmDelete?.episodeCount} episode(s) in Season {confirmDelete?.season} of "{confirmDelete?.showName}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeasonEpisodes}
              disabled={deletingSeasonEpisodes}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {deletingSeasonEpisodes && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All Episodes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
