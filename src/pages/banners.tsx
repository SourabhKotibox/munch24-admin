import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Eye, EyeOff, Plus, Trash2, PlayCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl, useDeleteBanner, useBulkDeleteBanners, useGetBannersList, useUpdateBanner } from "@/lib/api-client";

type BannerRow = {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  imageUrl?: string;
  position: number;
  isActive: boolean;
  content?: { id?: string; thumbnail?: string; episodeCount?: number; status?: string; contentType?: string };
};

export default function BannersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BannerRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { data: bannersData, isLoading } = useGetBannersList({ admin: true, page: currentPage, limit: itemsPerPage });
  const deleteMutation = useDeleteBanner();
  const updateMutation = useUpdateBanner();
  const bulkDeleteMutation = useBulkDeleteBanners();

  const banners: BannerRow[] = bannersData?.data || [];
  const activeCount = banners.filter((b) => b.isActive).length;
  const pagination = bannersData?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = banners.filter((b) => {
    const matchesSearch = !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (typeFilter === "all") return true;
    if (typeFilter === "movie") return b.content?.contentType === "movie";
    if (typeFilter === "tvshow") return b.content?.contentType === "series";
    if (typeFilter === "drama") return b.content?.contentType === "drama";
    if (typeFilter === "promotional") return !b.content;
    return true;
  });
  const allSelected = filtered.length > 0 && filtered.every((b) => selectedIds.includes(b.id));

  const getThumbnail = (banner: BannerRow) =>
    banner.content?.thumbnail || banner.thumbnail || banner.imageUrl || "";

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map((b) => b.id));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete") {
      try {
        await bulkDeleteMutation.mutateAsync(selectedIds);
        setSelectedIds([]);
        toast({ title: "Banners deleted successfully!" });
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
    }
    setBulkAction("");
  };

  const handleToggleActive = async (banner: BannerRow) => {
    try {
      const formData = new FormData();
      formData.append("isActive", (!banner.isActive).toString());
      await updateMutation.mutateAsync({ bannerId: banner.id, data: formData });
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
      toast({ title: `Banner ${!banner.isActive ? "activated" : "deactivated"} successfully!` });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeletingId(confirmDelete.id);
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast({ title: "Banner deleted successfully!" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Banners</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleApply}
          disabled={bulkDeleteMutation.isPending}
          className="bg-red-700 hover:bg-primary/80 text-white h-10 px-5 rounded-lg font-semibold"
        >
          Apply
        </Button>

        <div className="flex-1" />
        <p className="text-foreground/70 text-sm">{pagination.total} total · {activeCount} active</p>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-card border-border text-foreground h-10 rounded-lg">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="tvshow">TV Shows</SelectItem>
            <SelectItem value="drama">Short Dramas</SelectItem>
            <SelectItem value="promotional">Promotional</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-10 rounded-lg"
          />
        </div>
        <Button
          onClick={() => setLocation("/banners/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                />
              </TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Banner</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Episodes</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Position</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Status</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">
                  Loading banners...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">
                  No banners yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((banner) => {
                const thumbnail = getThumbnail(banner);
                return (
                  <TableRow key={banner.id} className="border-border hover:bg-muted/40">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(banner.id)}
                        onCheckedChange={() => toggleSelect(banner.id)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-12 overflow-hidden rounded-lg border border-border bg-muted shrink-0">
                          {thumbnail && (
                            <img
                              src={getImageUrl(thumbnail)}
                              alt={banner.title}
                              className="h-full w-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-foreground font-medium text-sm">{banner.title}</p>
                            {banner.content?.contentType ? (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                                banner.content.contentType === 'movie' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' :
                                banner.content.contentType === 'drama' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              }`}>
                                {banner.content.contentType === 'movie' ? 'Movie' :
                                 banner.content.contentType === 'drama' ? 'Short Drama' :
                                 'TV Show'}
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Promotional
                              </span>
                            )}
                          </div>
                          {banner.subtitle && (
                            <p className="text-foreground/65 text-xs line-clamp-1">{banner.subtitle}</p>
                          )}
                          {banner.content?.status && (
                            <p className="text-muted-foreground text-xs capitalize">{banner.content.status}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {banner.content?.episodeCount || 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{banner.position}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          banner.isActive ? "bg-green-500/15 text-green-400" : "bg-muted text-foreground/70"
                        }`}
                      >
                        {banner.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {banner.content?.id && (
                          <button
                            onClick={() => setLocation(`/banners/shows/${banner.content!.id}`)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-blue-400 hover:bg-primary/80/30 transition-colors"
                            title="View Episodes"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setLocation(`/banners/${banner.id}`)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(banner)}
                          disabled={updateMutation.isPending}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted/50 text-foreground/70 hover:bg-muted transition-colors disabled:opacity-40"
                          title={banner.isActive ? "Deactivate" : "Activate"}
                        >
                          {banner.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(banner)}
                          disabled={deletingId === banner.id}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors disabled:opacity-40"
                        >
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

      {!isLoading && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-foreground/70">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className="h-8 px-3 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                  pagination.page === i + 1
                    ? "bg-primary text-white"
                    : "bg-muted border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page === pagination.pages}
              className="h-8 px-3 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete "{confirmDelete?.title}"? This will also remove all associated episodes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-primary hover:bg-primary/90 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
