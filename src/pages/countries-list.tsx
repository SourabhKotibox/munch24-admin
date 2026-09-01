import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useGetCountries, useUpdateCountry, useDeleteCountry } from "../lib/api-client";

export default function CountriesListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const { data: countriesData, isLoading } = useGetCountries({ limit: 500, admin: true });
  const updateMutation = useUpdateCountry();
  const deleteMutation = useDeleteCountry();

  const countryList: any[] = countriesData?.data || [];

  const filtered = countryList.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map((c) => c.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { active: !currentActive } });
      toast({ title: `Country ${!currentActive ? "activated" : "deactivated"} successfully!` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete") {
      try {
        await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
        setSelectedIds([]);
        toast({ title: `${selectedIds.length} countr(ies) deleted` });
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
    }
    setBulkAction("");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
      toast({ title: `"${confirmDelete.name}" deleted successfully` });
      setConfirmDelete(null);
    } catch {
      toast({ title: "Failed to delete country", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Countries</span>
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
        <Button onClick={handleApply} className="bg-red-700 hover:bg-primary/80 text-white h-10 px-5 rounded-lg font-semibold">
          Apply
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-10 rounded-lg"
          />
        </div>
        <Button onClick={() => setLocation("/countries/new")} className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold">
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
              </TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Country</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Code</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Active</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-foreground/65 py-10">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-foreground/65 py-10">
                  {searchQuery ? "No countries match your search" : "No countries yet. Click New to add one."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((country) => (
                <TableRow key={country.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(country.id)} onCheckedChange={() => toggleSelect(country.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                  </TableCell>
                  <TableCell className="text-foreground font-medium text-sm">{country.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted text-foreground/70">
                      {country.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch checked={country.active} onCheckedChange={() => toggleActive(country.id, country.active)}
                      className="data-[state=checked]:bg-primary" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setLocation(`/countries/${country.id}/edit`)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(country)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors">
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
            <AlertDialogTitle>Delete Country</AlertDialogTitle>
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
