import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, ChevronLeft, Film, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  getImageUrl,
  useGetCategoryById,
  useGetCategoryContents,
  useUpdateContent,
  useDeleteContent
} from "@/lib/api-client";

type ShowRow = {
  id: string;
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  episodeCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function CategoryShowsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: categoryData, isLoading: categoryLoading } = useGetCategoryById(categoryId);
  const { data: showsData, isLoading: showsLoading } = useGetCategoryContents(categoryId);
  const deleteMutation = useDeleteContent();
  const updateMutation = useUpdateContent();

  const shows: ShowRow[] = showsData?.data || [];

  const handleToggleActive = async (item: ShowRow) => {
    try {
      const newStatus = item.status === "published" ? "draft" : "published";
      await updateMutation.mutateAsync({
        id: item._id || item.id,
        data: { status: newStatus }
      });
      queryClient.invalidateQueries({ queryKey: ["category-contents", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      toast({ title: `Show ${newStatus === "published" ? "activated" : "deactivated"} successfully!` });
    } catch (error) {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const handleDelete = async (item: ShowRow) => {
    if (!window.confirm(`Delete "${item.title}"?`)) {
      return;
    }

    try {
      setDeletingId(item._id || item.id);
      await deleteMutation.mutateAsync(item._id || item.id);
      queryClient.invalidateQueries({ queryKey: ["category-contents", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      toast({ title: "Show deleted successfully!" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/categories")}>
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {categoryData?.name || "Loading..."}
            </h1>
            <p className="text-muted-foreground mt-1">
              {shows.length} {shows.length === 1 ? "show" : "shows"}
            </p>
          </div>
        </div>
        <Button onClick={() => setLocation(`/categories/${categoryId}/shows/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Show
        </Button>
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Shows</CardTitle>
          <Badge variant="outline">{shows.length} items</Badge>
        </CardHeader>
        <CardContent>
          {showsLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading shows...</div>
          ) : shows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No shows yet</p>
              <Button onClick={() => setLocation(`/categories/${categoryId}/shows/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Show
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Show</TableHead>
                  <TableHead className="hidden md:table-cell">Episodes</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="w-[220px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shows.map((show) => {
                  return (
                    <TableRow key={show.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-20 w-14 overflow-hidden rounded-md border border-border bg-muted">
                            {show.thumbnail ? (
                              <img
                                src={getImageUrl(show.thumbnail)}
                                alt={show.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{show.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{show.subtitle}</p>
                            {show.description ? (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{show.description}</p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{show.episodeCount}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={show.status === "published" ? "default" : "outline"}>
                          {show.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/shows/${show._id || show.id}`)}
                            aria-label={`Edit ${show.title}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/categories/shows/${show.id}`)}
                            aria-label={`View ${show.title} episodes`}
                          >
                            <Film className="h-4 w-4 mr-1" />
                            Episodes
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(show)}
                            disabled={updateMutation.isPending}
                            aria-label={show.status === "published" ? "Deactivate show" : "Activate show"}
                          >
                            {show.status === "published" ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(show)}
                            disabled={deleteMutation.isPending || deletingId === (show._id || show.id)}
                            aria-label={`Delete ${show.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
