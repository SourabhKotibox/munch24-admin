
import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
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
import { useGetFAQs, useUpdateFAQ, useDeleteFAQ, useBulkDeleteFAQs } from "../lib/api-client";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  status: boolean;
};

export default function FaqListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<FAQ | null>(null);

  const { data: faqsData, isLoading } = useGetFAQs({ page: 1, limit: 100, admin: true });
  const updateMutation = useUpdateFAQ();
  const deleteMutation = useDeleteFAQ();
  const bulkDeleteMutation = useBulkDeleteFAQs();

  const faqs: FAQ[] = faqsData?.data || [];

  const filtered = faqs.filter((f) => {
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? f.status : !f.status);
    const matchSearch =
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const allSelected = filtered.length > 0 && filtered.every((f) => selectedIds.includes(f.id));

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map((f) => f.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const faq = faqs.find((f) => f.id === id);
    if (!faq) return;
    try {
      await updateMutation.mutateAsync({ id, data: { status: !currentStatus } });
      toast({ title: `FAQ ${!currentStatus ? 'activated' : 'deactivated'} successfully!` });
    } catch {
      toast({ title: "Failed to update FAQ status", variant: "destructive" });
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
        toast({ title: `${selectedIds.length} FAQ(s) deleted` });
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
      toast({ title: "FAQ deleted successfully" });
      setConfirmDelete(null);
    } catch {
      toast({ title: "Failed to delete FAQ", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">FAQ</span>
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
        <Button
          onClick={handleApply}
          className="bg-red-700 hover:bg-primary/80 text-white h-10 px-5 rounded-lg font-semibold"
        >
          Apply
        </Button>

        {/* Status Filter */}
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
          onClick={() => setLocation("/faq/new")}
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
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                />
              </TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Question</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Answer</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Status</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-foreground/65 py-10">
                  No FAQs found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((faq) => (
                <TableRow key={faq.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(faq.id)}
                      onCheckedChange={() => toggleSelect(faq.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                    />
                  </TableCell>
                  <TableCell className="text-foreground font-medium max-w-[280px]">
                    {faq.question}
                  </TableCell>
                  <TableCell className="text-foreground/70 text-sm max-w-[500px]">
                    <span className="line-clamp-2">{faq.answer}</span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={faq.status}
                      onCheckedChange={() => toggleStatus(faq.id, faq.status)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLocation(`/faq/${faq.id}/edit`)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(faq)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
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
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete this FAQ? This action cannot be undone.
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
