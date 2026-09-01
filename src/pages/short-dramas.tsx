import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Edit2, Trash2, Search, Plus, Loader2, ImageIcon, ChevronLeft, ChevronRight, Layers,
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
  useGetContentList, useDeleteContent, useUpdateContent, getImageUrl,
} from "@/lib/api-client";

const PAGE_SIZE = 20;

export default function ShortDramasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("action");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetContentList({
    contentType: "drama",
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? (statusFilter === "active" ? "published" : "draft") : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const deleteMutation = useDeleteContent();
  const updateMutation = useUpdateContent();

  const allShows: any[] = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.pages || 1;

  const allSelected = allShows.length > 0 && allShows.every((s) => selectedIds.includes(s._id));
  const toggleAll = () =>
    allSelected ? setSelectedIds([]) : setSelectedIds(allShows.map((s) => s._id));
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleToggleStatus = async (show: any) => {
    try {
      const newStatus = show.status === "published" ? "draft" : "published";
      await updateMutation.mutateAsync({ id: show._id, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      toast({ title: `Short Drama ${newStatus === "published" ? "activated" : "deactivated"}.` });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete._id);
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      toast({ title: "Short Drama deleted successfully!" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleBulkAction = () => {
    if (bulkAction === "action" || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete") {
      setBulkConfirmOpen(true);
      return;
    }
    executeBulkAction();
  };

  const executeBulkAction = async () => {
    try {
      if (bulkAction === "activate") {
        await Promise.all(selectedIds.map((id) => updateMutation.mutateAsync({ id, data: { status: "published" } })));
        toast({ title: `${selectedIds.length} short drama(s) activated.` });
      } else if (bulkAction === "deactivate") {
        await Promise.all(selectedIds.map((id) => updateMutation.mutateAsync({ id, data: { status: "draft" } })));
        toast({ title: `${selectedIds.length} short drama(s) deactivated.` });
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      setBulkAction("action");
    } catch {
      toast({ title: "Action failed. Please try again.", variant: "destructive" });
    }
  };

  const confirmBulkDelete = async () => {
    setBulkConfirmOpen(false);
    try {
      await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
      toast({ title: `${selectedIds.length} short drama(s) deleted successfully.` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      setBulkAction("action");
    } catch {
      toast({ title: "Bulk delete failed. Please try again.", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Short Dramas</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Bulk action */}
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="action">Action</SelectItem>
            <SelectItem value="delete">Delete Selected</SelectItem>
            <SelectItem value="activate">Activate</SelectItem>
            <SelectItem value="deactivate">Deactivate</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleBulkAction}
          className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-lg font-semibold text-sm">
          Apply
        </Button>

        <div className="flex-1" />

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-28 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Published</SelectItem>
            <SelectItem value="inactive">Draft</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm focus:border-primary" />
        </div>

        <Button onClick={() => setLocation("/short-dramas/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold text-sm">
          <Plus className="h-4 w-4" /> New
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
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide min-w-[220px]">Short Drama</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Genres</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Language</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Episodes</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Plan</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allShows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-foreground/65 py-14">
                    {searchQuery ? "No short dramas match your search" : "No short dramas yet. Click New to add one."}
                  </TableCell>
                </TableRow>
              ) : (
                allShows.map((show) => (
                  <TableRow key={show._id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(show._id)} onCheckedChange={() => toggleOne(show._id)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-11 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                          {show.thumbnail ? (
                            <img src={getImageUrl(show.thumbnail)} alt={show.title} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground/80" />
                          )}
                        </div>
                        <div>
                          <button onClick={() => setLocation(`/short-dramas/${show._id}`)}
                            className="text-foreground font-medium text-sm hover:text-primary transition-colors text-left">
                            {show.title}
                          </button>
                          <p className="text-xs text-foreground/65 mt-0.5 capitalize">{show.contentType || "drama"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(show.genres || []).slice(0, 3).map((g: any) => {
                          const name = typeof g === "object" ? g.name : g;
                          const key = typeof g === "object" ? (g._id || g.id || name) : g;
                          return (
                            <span key={key} className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/70">{name}</span>
                          );
                        })}
                        {(show.genres || []).length > 3 && (
                          <span className="text-xs text-muted-foreground/80">+{show.genres.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground/70 text-sm">
                      {(show.languages || []).slice(0, 2).map((l: any) => typeof l === "object" ? l.name : l).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-foreground/70 text-sm text-center">
                      {show.episodeCount ?? 0}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        show.planRequired === "free" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {show.planRequired || "free"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch checked={show.status === "published"}
                        onCheckedChange={() => handleToggleStatus(show)}
                        className="data-[state=checked]:bg-primary" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setLocation(`/short-dramas/${show._id}`)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="Manage Seasons & Episodes">
                          <Layers className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setLocation(`/short-dramas/${show._id}/edit`)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                          title="Edit">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(show)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/30/30 transition-colors"
                          title="Delete">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            {pagination?.total ? ` · ${pagination.total} total` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1} className="h-8 w-8 p-0 border-border">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages} className="h-8 w-8 p-0 border-border">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Single Delete Confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Short Drama</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete "{confirmDelete?.title}"?
              <br />All related episodes will also be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-primary hover:bg-primary/90 text-white border-0">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirm */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Short Drama(s)</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete {selectedIds.length} selected short drama(s)?
              <br />All related episodes will also be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}
              className="bg-primary hover:bg-primary/90 text-white border-0">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
