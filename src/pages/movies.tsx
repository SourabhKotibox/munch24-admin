import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Edit2, Eye, Trash2, Search, Plus, Download, Upload,
  SlidersHorizontal, ImageIcon, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
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
  useGetMovies,
  useDeleteMovie,
  useToggleMovieFeatured,
  useToggleMovieTrending,
  useUpdateMovieStatus,
  useGetLanguagesList,
} from "@/lib/api-client";
import { getImageUrl } from "@/lib/api-client";

type AccessType = "paid" | "free" | "pay_per_view";

type MovieRow = {
  id: string;
  title: string;
  thumbnail?: string;
  genres: Array<{ name: string }>;
  releaseDate?: string;
  likes: number;
  views: number;
  planRequired: string;
  languages: Array<{ name: string }>;
  status: string;
  featured: boolean;
  trending: boolean;
};

const ACCESS_BADGE: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-green-500/20 text-green-400" },
  basic: { label: "Basic", className: "bg-primary/20 text-blue-400" },
  standard: { label: "Standard", className: "bg-purple-500/20 text-purple-400" },
  premium: { label: "Premium", className: "bg-amber-500/20 text-amber-400" },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  published: { label: "Published", className: "bg-green-500/20 text-green-400" },
  draft: { label: "Draft", className: "bg-zinc-500/20 text-foreground/70" },
  processing: { label: "Processing", className: "bg-primary/20 text-blue-400" },
  moderation: { label: "Moderation", className: "bg-amber-500/20 text-amber-400" },
  rejected: { label: "Rejected", className: "bg-primary/20 text-primary" },
};

export default function MoviesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("action");
  const [confirmDelete, setConfirmDelete] = useState<MovieRow | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Advanced Filter states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [planFilter, setPlanFilter] = useState("all");
  const [langFilter, setLangFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [trendingFilter, setTrendingFilter] = useState("all");

  const { data: langsData } = useGetLanguagesList();
  const languagesList = langsData?.data || [];

  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter, planFilter, langFilter, featuredFilter, trendingFilter]);

  const isAnyFilterActive =
    planFilter !== "all" ||
    langFilter !== "all" ||
    featuredFilter !== "all" ||
    trendingFilter !== "all";

  const handleResetFilters = () => {
    setPlanFilter("all");
    setLangFilter("all");
    setFeaturedFilter("all");
    setTrendingFilter("all");
  };

  const { data: moviesData, isLoading } = useGetMovies({
    page: 1,
    limit: 100,
    search: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const movies = moviesData?.data || [];

  const deleteMutation = useDeleteMovie();
  const toggleFeaturedMutation = useToggleMovieFeatured();
  const toggleTrendingMutation = useToggleMovieTrending();
  const updateStatusMutation = useUpdateMovieStatus();

  const filtered = movies.filter((m) => {
    const matchStatus =
      statusFilter === "all" ||
      m.status === statusFilter;

    const matchPlan =
      planFilter === "all" ||
      m.planRequired === planFilter;

    const matchLang =
      langFilter === "all" ||
      m.languages.some((l: any) => l.name === langFilter);

    const matchFeatured =
      featuredFilter === "all" ||
      (featuredFilter === "yes" && m.featured) ||
      (featuredFilter === "no" && !m.featured);

    const matchTrending =
      trendingFilter === "all" ||
      (trendingFilter === "yes" && m.trending) ||
      (trendingFilter === "no" && !m.trending);

    return matchStatus && matchPlan && matchLang && matchFeatured && matchTrending;
  });

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedIds.includes(m.id));

  const toggleAll = () =>
    allSelected ? setSelectedIds([]) : setSelectedIds(filtered.map((m) => m.id));

  const toggleOne = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    updateStatusMutation.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: `Movie ${newStatus === 'published' ? 'published' : 'unpublished'} successfully!` });
        },
      }
    );
  };

  const handleToggleFeatured = (id: string) => {
    toggleFeaturedMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Featured status updated!" });
      },
    });
  };

  const handleToggleTrending = (id: string) => {
    toggleTrendingMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Trending status updated!" });
      },
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast({ title: "Movie deleted successfully!" });
        setConfirmDelete(null);
        setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
      },
    });
  };

  const handleApplyBulk = () => {
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
        await Promise.all(
          selectedIds.map((id) =>
            updateStatusMutation.mutateAsync({ id, data: { status: "published" } })
          )
        );
        toast({ title: `${selectedIds.length} movie(s) published.` });
      } else if (bulkAction === "deactivate") {
        await Promise.all(
          selectedIds.map((id) =>
            updateStatusMutation.mutateAsync({ id, data: { status: "draft" } })
          )
        );
        toast({ title: `${selectedIds.length} movie(s) set to draft.` });
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      setBulkAction("action");
    } catch {
      toast({ title: "Action failed. Please try again.", variant: "destructive" });
    }
  };

  const confirmBulkDelete = async () => {
    setBulkConfirmOpen(false);
    try {
      await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
      toast({ title: `${selectedIds.length} movie(s) deleted successfully.` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      setBulkAction("action");
    } catch {
      toast({ title: "Bulk delete failed. Please try again.", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Movies</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="action">Action</SelectItem>
            <SelectItem value="delete">Delete Selected</SelectItem>
            <SelectItem value="activate">Activate</SelectItem>
            <SelectItem value="deactivate">Deactivate</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleApplyBulk}
          className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-lg font-semibold text-sm"
        >
          Apply
        </Button>


        <div className="flex-1" />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="moderation">Moderation</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm focus:border-primary"
          />
        </div>

        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="outline"
          className={`bg-card border-border text-foreground h-10 gap-2 rounded-lg text-sm hover:bg-muted transition-all ${
            showAdvanced ? "border-primary text-primary hover:text-primary bg-primary/5" : ""
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced Filter
        </Button>

        <Button
          onClick={() => setLocation("/movies/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold text-sm"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {showAdvanced && (
        <div className="bg-card border border-border p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Plan Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan</label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full bg-background border-border text-foreground h-10 rounded-lg text-sm">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Language</label>
              <Select value={langFilter} onValueChange={setLangFilter}>
                <SelectTrigger className="w-full bg-background border-border text-foreground h-10 rounded-lg text-sm">
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="all">All Languages</SelectItem>
                  {languagesList.map((lang: any) => (
                    <SelectItem key={lang._id || lang.id} value={lang.name}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Featured Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Featured</label>
              <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                <SelectTrigger className="w-full bg-background border-border text-foreground h-10 rounded-lg text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes (Featured)</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trending Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trending</label>
              <Select value={trendingFilter} onValueChange={setTrendingFilter}>
                <SelectTrigger className="w-full bg-background border-border text-foreground h-10 rounded-lg text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes (Trending)</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isAnyFilterActive && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-primary hover:text-red-500 font-bold hover:bg-red-500/10 h-8 px-3 rounded-lg"
              >
                Clear Advanced Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-card hover:bg-card">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                  />
                </TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide min-w-[200px]">Movie</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Like</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Watch</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Plan</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Language</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Featured</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Trending</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-foreground/65 py-14">
                    No movies yet
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((movie) => {
                  const planBadge = ACCESS_BADGE[movie.planRequired] || ACCESS_BADGE.free;
                  const statusBadge = STATUS_BADGE[movie.status] || STATUS_BADGE.draft;
                  return (
                    <TableRow key={movie.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(movie.id)}
                          onCheckedChange={() => toggleOne(movie.id)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-11 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                            {movie.thumbnail ? (
                              <img src={getImageUrl(movie.thumbnail)} alt={movie.title} className="h-full w-full object-contain" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground/80" />
                            )}
                          </div>
                          <div>
                            <p className="text-foreground font-medium text-sm">{movie.title}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {movie.genres.map((g) => (
                                <span key={g.name} className="text-xs text-foreground/65">{g.name}</span>
                              ))}
                            </div>
                            {movie.releaseDate && (
                              <p className="text-xs text-muted-foreground/80 mt-0.5">{new Date(movie.releaseDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground/70 text-sm">{movie.likes}</TableCell>
                      <TableCell className="text-foreground/70 text-sm">{movie.views}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${planBadge.className}`}>
                          {planBadge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground/70 text-sm">{movie.languages[0]?.name || '-'}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleStatus(movie.id, movie.status)}
                          className="text-foreground/70 hover:text-foreground"
                        >
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={movie.featured}
                          onCheckedChange={() => handleToggleFeatured(movie.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={movie.trending}
                          onCheckedChange={() => handleToggleTrending(movie.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setLocation(`/movies/${movie.id}/edit`)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-blue-400 hover:bg-primary/80/30 transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(movie)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
                            title="Delete"
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
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Movie</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete "{confirmDelete?.title}"? This action cannot be undone.
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Movie(s)</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete {selectedIds.length} selected movie(s)?
              <br />This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-primary hover:bg-primary/90 text-white">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
