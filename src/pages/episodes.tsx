import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Edit2, Trash2, Search, Plus, Loader2, ImageIcon, Lock, Unlock,
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
  useGetEpisodeList, useDeleteEpisode, useToggleEpisodeLock, getImageUrl,
} from "@/lib/api-client";

export default function EpisodesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("action");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetEpisodeList({
    page,
    limit: 50,
    search: searchQuery || undefined,
  });
  const deleteEpisodeMutation = useDeleteEpisode();
  const toggleLockMutation = useToggleEpisodeLock();

  const episodes: any[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pages || 1;

  const allSelected = episodes.length > 0 && episodes.every((ep) => selectedIds.includes(ep._id));
  const toggleAll = () =>
    allSelected ? setSelectedIds([]) : setSelectedIds(episodes.map((ep) => ep._id));
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEpisodeMutation.mutateAsync(confirmDelete._id);
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      queryClient.invalidateQueries({ queryKey: ["season-list"] });
      toast({ title: "Episode deleted successfully!" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleToggleLock = async (ep: any) => {
    try {
      await toggleLockMutation.mutateAsync({ id: ep._id, isLocked: !ep.isLocked });
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      toast({ title: `Episode ${ep.isLocked ? "unlocked" : "locked"}.` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleApplyBulk = async () => {
    if (!selectedIds.length) return;
    if (bulkAction === "delete") {
      try {
        await Promise.all(selectedIds.map((id) => deleteEpisodeMutation.mutateAsync(id)));
        queryClient.invalidateQueries({ queryKey: ["episode-list"] });
        queryClient.invalidateQueries({ queryKey: ["season-list"] });
        toast({ title: `${selectedIds.length} episode(s) deleted.` });
        setSelectedIds([]);
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span><span>/</span>
        <span className="text-foreground font-medium">Episodes</span>
        {total > 0 && (
          <span className="text-muted-foreground/80 text-xs">({total} total)</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue />
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search episodes..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm focus:border-primary"
          />
        </div>

        <Button
          onClick={() => setLocation("/episodes/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold text-sm"
        >
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
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide min-w-[200px]">Episode</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Season</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">TV Show</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Duration</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Access</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Locked</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {episodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-foreground/65 py-14">
                    {searchQuery ? "No episodes match your search" : "No episodes yet. Click New Episode to add one."}
                  </TableCell>
                </TableRow>
              ) : (
                episodes.map((ep) => (
                  <TableRow key={ep._id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(ep._id)} onCheckedChange={() => toggleOne(ep._id)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-20 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                          {ep.thumbnail ? (
                            <img src={getImageUrl(ep.thumbnail)} alt={ep.title} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground/80" />
                          )}
                        </div>
                        <div>
                          <p className="text-foreground font-medium text-sm">{ep.title}</p>
                          <p className="text-xs text-foreground/65 mt-0.5">Ep {ep.episode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground/70 text-sm">Season {ep.season}</span>
                    </TableCell>
                    <TableCell className="text-foreground/70 text-sm">
                      {ep.showName || (ep.contentId as any)?.title || "—"}
                    </TableCell>
                    <TableCell className="text-foreground/70 text-sm">{formatDuration(ep.duration)}</TableCell>
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
                        <button
                          onClick={() => setLocation(`/episodes/${ep._id}/edit`)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(ep)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
                          title="Delete"
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} episodes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-border h-8">
              Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-border h-8">
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
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
