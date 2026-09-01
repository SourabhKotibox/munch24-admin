import { useState } from "react";
import {
  useGetAdminReviewsList,
  updateAdminReviewStatus,
  deleteAdminReview,
} from "../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Eye, EyeOff, Trash2, Star, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/SettingsContext";

export default function Reviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useGetAdminReviewsList({
    page,
    limit: 15,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const reviews = data?.data || [];
  const pagination = data?.pagination;

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "published" ? "hidden" : "published";
      await updateAdminReviewStatus(id, newStatus);
      toast({ title: `Review marked as ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err: any) {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAdminReview(deleteId);
      toast({ title: "Review deleted" });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Moderate website experience reviews from users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">User</TableHead>
                <TableHead className="text-foreground font-semibold">Rating</TableHead>
                <TableHead className="text-foreground font-semibold min-w-[250px]">Comment</TableHead>
                <TableHead className="text-foreground font-semibold">Date</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border animate-pulse">
                    <TableCell><div className="h-4 w-24 bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-12 bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-48 bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted rounded ml-auto"></div></TableCell>
                  </TableRow>
                ))
              ) : reviews.length === 0 ? (
                  <TableRow className="border-border">
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review: any) => (
                  <TableRow key={review._id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">
                      {review.userId?.name || "Unknown"}
                      <div className="text-xs text-muted-foreground font-normal">{review.userId?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-foreground">{review.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-[300px]" title={review.comment}>
                        {review.comment || <span className="italic opacity-50">No comment</span>}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={review.status === "published" ? "default" : "secondary"} className={
                        review.status === "published" ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/30" : "bg-zinc-500/15 text-foreground/65 hover:bg-zinc-500/25 border-zinc-500/30"
                      }>
                        {review.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusToggle(review._id, review.status)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={review.status === "published" ? "Hide Review" : "Publish Review"}
                        >
                          {review.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(review._id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing page {page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-border text-foreground hover:bg-muted"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="border-border text-foreground hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Review</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
