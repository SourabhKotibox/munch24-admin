
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Search, Upload, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useGetActors, useUpdateActor, useDeleteActor, useBulkDeleteActors, useCreateActor, getImageUrl } from "../lib/api-client";

type Actor = {
  id: string;
  name: string;
  designation: string;
  image: string;
  dateOfBirth: string;
  birthPlace: string;
  status: boolean;
};

export default function ActorsListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const importRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Actor | null>(null);

  const { data: actorsData, isLoading } = useGetActors({ page: 1, limit: 100, admin: true });
  const updateMutation = useUpdateActor();
  const deleteMutation = useDeleteActor();
  const bulkDeleteMutation = useBulkDeleteActors();
  const createActor = useCreateActor();

  const actors: Actor[] = actorsData?.data || [];

  const filtered = actors.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.birthPlace.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((a) => selectedIds.includes(a.id));

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map((a) => a.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const actor = actors.find((a) => a.id === id);
    if (!actor) return;
    try {
      const formData = new FormData();
      formData.append('name', actor.name);
      formData.append('designation', actor.designation);
      formData.append('dateOfBirth', actor.dateOfBirth);
      formData.append('birthPlace', actor.birthPlace);
      formData.append('status', (!currentStatus).toString());
      await updateMutation.mutateAsync({ id, formData });
      toast({ title: `Actor ${!currentStatus ? 'activated' : 'deactivated'} successfully!` });
    } catch {
      toast({ title: "Failed to update actor status", variant: "destructive" });
    }
  };

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete") {
      try {
        await bulkDeleteMutation.mutateAsync(selectedIds);
        setSelectedIds([]);
        toast({ title: `${selectedIds.length} actor(s) deleted` });
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
    }
    setBulkAction("");
  };

  const handleExport = () => {
    const rows = filtered.map((a) => [a.name, a.designation, a.dateOfBirth, a.birthPlace, a.status ? "Active" : "Inactive"]);
    const csv = [["Name", "Designation", "Date Of Birth", "Birth Place", "Status"], ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "actors.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 4) continue;
        
        const formData = new FormData();
        formData.append('name', values[0]?.trim() || '');
        formData.append('designation', values[1]?.trim() || '');
        formData.append('dateOfBirth', values[2]?.trim() || '');
        formData.append('birthPlace', values[3]?.trim() || '');
        formData.append('status', (values[4]?.trim() === 'Active').toString());
        
        // Create actor
        try {
          await createActor.mutateAsync(formData);
        } catch (error) {
          console.error('Error importing actor:', error);
        }
      }
      
      toast({ title: "Actors imported successfully" });
    };
    reader.readAsText(file);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
      toast({ title: `"${confirmDelete.name}" deleted successfully` });
      setConfirmDelete(null);
    } catch {
      toast({ title: "Failed to delete actor", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Actors</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleApply} className="bg-red-700 hover:bg-primary/80 text-white h-10 px-5 rounded-lg font-semibold">
          Apply
        </Button>
        <Button variant="outline" onClick={handleExport} className="border-border text-foreground hover:bg-muted hover:text-foreground h-10 gap-2 rounded-lg">
          <Download className="h-4 w-4" />Export
        </Button>
        <Button variant="outline" onClick={() => importRef.current?.click()} className="border-border text-foreground hover:bg-muted hover:text-foreground h-10 gap-2 rounded-lg">
          <Upload className="h-4 w-4" />Import
        </Button>
        <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />

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
        <Button onClick={() => setLocation("/actors/new")} className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold">
          <Plus className="h-4 w-4" />New
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
              </TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Actors</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Date Of Birth</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Birth Place</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Status</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">No actors found</TableCell>
              </TableRow>
            ) : (
              filtered.map((actor) => (
                <TableRow key={actor.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(actor.id)} onCheckedChange={() => toggleSelect(actor.id)} className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {actor.image ? (
                        <img src={getImageUrl(actor.image)} alt={actor.name} className="h-12 w-12 rounded-lg object-contain shrink-0 bg-gray-800" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-foreground/65" />
                        </div>
                      )}
                      <div>
                        <p className="text-foreground font-semibold text-sm">{actor.name}</p>
                        <p className="text-foreground/65 text-xs mt-0.5">{actor.designation}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{actor.dateOfBirth}</TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{actor.birthPlace}</TableCell>
                  <TableCell>
                    <Switch checked={actor.status} onCheckedChange={() => toggleStatus(actor.id, actor.status)} className="data-[state=checked]:bg-primary" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setLocation(`/actors/${actor.id}/edit`)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(actor)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors">
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
            <AlertDialogTitle>Delete Actor</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete "{confirmDelete?.name}"?
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
