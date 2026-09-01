import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Trash2, Film, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useDeleteCategory, useBulkDeleteCategories, useGetCategoriesList, useUpdateCategory, getImageUrl } from "@/lib/api-client";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  bannerImage?: string;
  icon?: string;
  color?: string;
  contentCount: number;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export default function CategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CategoryRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: categoriesData, isLoading } = useGetCategoriesList({ admin: true, page: currentPage, limit: itemsPerPage });
  console.log("categories.tsx: categoriesData:", categoriesData);
  const deleteMutation = useDeleteCategory();
  const bulkDeleteMutation = useBulkDeleteCategories();
  const updateMutation = useUpdateCategory();

  const categories: CategoryRow[] = categoriesData?.data || [];
  const pagination = categoriesData?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  const filtered = categories.filter((c) =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map((c) => c.id));
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
        toast({ title: "Categories deleted successfully!" });
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
    }
    setBulkAction("");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeletingId(confirmDelete.id);
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast({ title: "Category deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleToggleActive = async (category: CategoryRow) => {
    try {
      setUpdatingId(category.id);
      const formData = new FormData();
      formData.append('isActive', (!category.isActive).toString());
      await updateMutation.mutateAsync({ categoryId: category.id, data: formData });
      toast({ title: "Category updated successfully!" });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-muted-foreground">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Categories</span>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-10 rounded-lg"
          />
        </div>
        <Button
          onClick={() => setLocation("/categories/new")}
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
              <TableHead className="text-muted-foreground font-semibold text-sm">Category</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-sm">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-sm">Content</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-sm">Order</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((category) => (
                <TableRow key={category.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(category.id)}
                      onCheckedChange={() => toggleSelect(category.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {category.thumbnail && (
                        <img
                          src={getImageUrl(category.thumbnail)}
                          alt={category.name}
                          className="w-12 h-12 rounded-lg object-contain bg-gray-800"
                          onError={(e) => console.error("Image failed to load:", e, "src:", getImageUrl(category.thumbnail))}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-foreground font-medium text-sm">{category.name}</p>
                          {category.isFeatured && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        {category.description && (
                          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{category.description}</p>
                        )}
                        {category.slug && (
                          <p className="text-muted-foreground text-xs mt-0.5">{category.slug}</p>
                        )}
                      </div>
                      {category.color && (
                        <div
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={() => handleToggleActive(category)}
                      disabled={updatingId === category.id}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="text-sm text-foreground">{category.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{category.contentCount}</TableCell>
                  <TableCell className="text-foreground text-sm">{category.order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setLocation(`/categories/${category.id}/shows`)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-blue-400 hover:bg-primary/80/30 transition-colors"
                        title="View Shows"
                      >
                        <Film className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setLocation(`/categories/${category.id}`)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(category)}
                        disabled={deletingId === category.id}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors disabled:opacity-40"
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

      {!isLoading && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{confirmDelete?.name}"? This action cannot be undone.
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