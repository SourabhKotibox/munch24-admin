import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Edit2, Eye, EyeOff, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useGetContentList, useUpdateContent, useDeleteContent, getImageUrl } from "@/lib/api-client";

type ContentRow = {
  _id: string;
  title: string;
  shortDescription?: string;
  thumbnail?: string;
  type: "movie" | "series";
  status: string;
  categories: Array<{ _id: string; name: string }>;
  views?: number;
  likes?: number;
  shares?: number;
};

export default function ShowsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contentData, isLoading } = useGetContentList({});
  const deleteMutation = useDeleteContent();
  const updateMutation = useUpdateContent();

  const content: ContentRow[] = contentData?.data || [];
  const activeCount = content.filter((item) => item.status === "published").length;

  const filtered = content.filter((item) =>
    !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleActive = async (item: ContentRow) => {
    try {
      const newStatus = item.status === "published" ? "draft" : "published";
      await updateMutation.mutateAsync({ id: item._id, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      toast({ title: `Show ${newStatus === "published" ? "activated" : "deactivated"} successfully!` });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeletingId(confirmDelete._id);
      await deleteMutation.mutateAsync(confirmDelete._id);
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      toast({ title: "Show deleted successfully!" });
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
        <span className="text-foreground font-medium">Shows</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-foreground/70 text-sm">{content.length} total · {activeCount} active</p>
        <div className="flex-1" />
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
          onClick={() => setLocation("/shows/new")}
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
              <TableHead className="text-foreground/70 font-semibold text-sm">Show</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Type</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Categories</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Views</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Status</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">
                  Loading shows...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">
                  No shows yet
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item._id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-12 overflow-hidden rounded-lg border border-border bg-muted shrink-0">
                        {item.thumbnail && (
                          <img
                            src={getImageUrl(item.thumbnail)}
                            alt={item.title}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-foreground font-medium text-sm">{item.title}</p>
                        {item.shortDescription && (
                          <p className="text-foreground/65 text-xs mt-0.5 line-clamp-1">{item.shortDescription}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground capitalize">
                      {item.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.categories.slice(0, 2).map((cat) => (
                        <span
                          key={cat._id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted/60 text-muted-foreground"
                        >
                          {cat.name}
                        </span>
                      ))}
                      {item.categories.length > 2 && (
                        <span className="text-foreground/65 text-xs">+{item.categories.length - 2}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.views || 0}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        item.status === "published" || item.status === "active"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-muted text-foreground/70"
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setLocation(`/shows/${item._id}`)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-blue-400 hover:bg-primary/80/30 transition-colors"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setLocation(`/shows/${item._id}/edit`)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(item)}
                        disabled={updateMutation.isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted/50 text-foreground/70 hover:bg-muted transition-colors disabled:opacity-40"
                        title={item.status === "published" ? "Deactivate" : "Activate"}
                      >
                        {item.status === "published"
                          ? <EyeOff className="h-3.5 w-3.5" />
                          : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item)}
                        disabled={deletingId === item._id}
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

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Show</AlertDialogTitle>
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
    </div>
  );
}
