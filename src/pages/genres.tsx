import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Upload, Download, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { useGetGenres, useDeleteGenre, useUpdateGenre, useBulkDeleteGenres, useCreateGenre, getImageUrl } from "@/lib/api-client";

type Genre = {
  id: string;
  name: string;
  image: string;
  active: boolean;
};

export default function GenresPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: genresData, isLoading } = useGetGenres({ admin: true });
  const deleteGenre = useDeleteGenre();
  const updateGenre = useUpdateGenre();
  const bulkDeleteGenres = useBulkDeleteGenres();
  const createGenre = useCreateGenre();
  
  const genres = genresData?.data || [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkAction, setBulkAction] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Genre | null>(null);

  const filtered = genres.filter((g: Genre) => {
    const matchSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && g.active) ||
      (statusFilter === "inactive" && !g.active);
    return matchSearch && matchStatus;
  });

  const allSelected = filtered.length > 0 && filtered.every((g) => selectedIds.includes(g.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((g) => g.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const genre = genres.find((g: Genre) => g.id === id);
    if (!genre) return;
    
    const formData = new FormData();
    formData.append('name', genre.name); // Include current name
    formData.append('active', (!currentStatus).toString());
    await updateGenre.mutateAsync({
      id,
      data: formData,
    });
  };

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete") {
      await bulkDeleteGenres.mutateAsync(selectedIds);
      setSelectedIds([]);
      toast({ title: `${selectedIds.length} genre(s) deleted` });
    }
    setBulkAction("");
  };

  const handleExport = () => {
    const data = genres.map((g: Genre) => ({
      Name: g.name,
      Image: g.image || '',
      Active: g.active ? 'Yes' : 'No',
    }));

    const headers = ['Name', 'Image', 'Active'];
    const csvContent = [
      headers.join(','),
      ...data.map((row) => headers.map((header) => `"${row[header as keyof typeof row]}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'genres.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Genres exported successfully' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      
      if (lines.length < 2) {
        toast({ title: 'Invalid file format', variant: 'destructive' });
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
        const genreData: any = {};
        
        headers.forEach((header, index) => {
          if (header === 'Name') genreData.name = values[index];
          if (header === 'Image') genreData.image = values[index];
          if (header === 'Active') genreData.active = values[index]?.toLowerCase() === 'yes';
        });

        if (genreData.name) {
          try {
            const formData = new FormData();
            formData.append('name', genreData.name);
            if (genreData.image) formData.append('image', genreData.image);
            formData.append('active', genreData.active?.toString() || 'true');
            await createGenre.mutateAsync(formData);
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }

      toast({ 
        title: `Import completed: ${successCount} added, ${errorCount} failed`,
        variant: errorCount > 0 ? 'destructive' : 'default'
      });
      
      // Reset file input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleDelete = (genre: Genre) => setConfirmDelete(genre);

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    await deleteGenre.mutateAsync(confirmDelete.id);
    setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
    toast({ title: `"${confirmDelete.name}" deleted successfully` });
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Genres</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Bulk action */}
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
          className="bg-red-700 hover:bg-primary/80 text-white h-10 px-5 rounded-lg font-semibold"
        >
          Apply
        </Button>

        <div className="flex-1" />

        {/* Export / Import */}
        <Button
          variant="outline"
          onClick={handleExport}
          className="border-border text-foreground hover:bg-muted hover:text-foreground h-10 gap-2 rounded-lg"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="outline"
          onClick={() => document.getElementById('import-file-input')?.click()}
          className="border-border text-foreground hover:bg-muted hover:text-foreground h-10 gap-2 rounded-lg"
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <input
          id="import-file-input"
          type="file"
          accept=".csv,.xlsx"
          onChange={handleImport}
          className="hidden"
        />

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 bg-card border-border text-foreground h-10 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-10 rounded-lg"
          />
        </div>

        {/* New button */}
        <Button
          onClick={() => setLocation("/genres/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                />
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm">
                <div className="flex items-center gap-1">
                  Genres
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/65" />
                </div>
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm">
                <div className="flex items-center gap-1">
                  Status
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/65" />
                </div>
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm text-right pr-6">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={4} className="text-center text-foreground/65 py-16">
                  No genres found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((genre) => (
                <TableRow
                  key={genre.id}
                  className="border-border hover:bg-card/60 transition-colors"
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedIds.includes(genre.id)}
                      onCheckedChange={() => toggleSelect(genre.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={getImageUrl(genre.image)}
                        alt={genre.name}
                        className="h-10 w-10 rounded-lg object-contain border border-border bg-gray-800"
                      />
                      <span className="font-medium text-foreground">{genre.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={genre.active}
                      onCheckedChange={() => toggleStatus(genre.id, genre.active)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLocation(`/genres/${genre.id}/edit`)}
                        className="h-8 w-8 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(genre)}
                        className="h-8 w-8 rounded-lg bg-primary/20 hover:bg-primary/80/40 text-primary border border-red-600/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Showing count */}
      <p className="text-sm text-foreground/65">
        Showing {filtered.length} of {genres.length} genres
      </p>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent className="bg-card border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Genre</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground/80">"{confirmDelete?.name}"</span>?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAction}
              className="bg-primary hover:bg-primary/90 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
