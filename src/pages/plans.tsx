import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import {
  useGetSubscriptionPlans,
  useDeleteSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useBulkDeleteSubscriptionPlans,
} from "@/lib/api-client";

type Plan = {
  id: string;
  name: string;
  duration: string;
  durationValue: number;
  level: number;
  price: number;
  discount: number;
  totalPrice: number;
  status: boolean;
  description: string;
};

const PAGE_SIZE = 10;

export default function PlansPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { settings } = useSettings();

  const formatCurrency = (val: number | string) => {
    const num = Number(val && typeof val === "string" ? val.replace(/[^0-9.-]+/g,"") : val) || 0;
    return settings?.currencyPosition === "before" 
      ? `${settings?.currencySymbol || '₹'}${num.toFixed(settings?.decimalPlaces ?? 2)}` 
      : `${num.toFixed(settings?.decimalPlaces ?? 2)} ${settings?.currencySymbol || '₹'}`;
  };

  const { data: plansData, isLoading } = useGetSubscriptionPlans({ limit: 100 });
  const deletePlan = useDeleteSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();
  const bulkDeletePlans = useBulkDeleteSubscriptionPlans();

  const plans: Plan[] = plansData?.data || [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkAction, setBulkAction] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);
  const [page, setPage] = useState(1);

  const filtered = plans.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.status) ||
      (statusFilter === "inactive" && !p.status);
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allSelected =
    paginated.length > 0 && paginated.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () =>
    allSelected
      ? setSelectedIds([])
      : setSelectedIds(paginated.map((p) => p.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await updatePlan.mutateAsync({ id, data: { status: !currentStatus } });
  };

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete") {
      await bulkDeletePlans.mutateAsync(selectedIds);
      setSelectedIds([]);
      toast({ title: `${selectedIds.length} plan(s) deleted` });
    }
    setBulkAction("");
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    await deletePlan.mutateAsync(confirmDelete.id);
    setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
    toast({ title: `"${confirmDelete.name}" deleted` });
    setConfirmDelete(null);
  };

  const durationLabel = (p: Plan) =>
    `${p.durationValue} ${p.duration}${p.durationValue > 1 ? "s" : ""}`;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Subscription Plans</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Bulk action */}
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="delete">Delete Selected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleApply}
          className="bg-red-700 hover:bg-primary/80 text-white h-10 px-5 rounded-lg font-semibold text-sm">
          Apply
        </Button>

        <div className="flex-1" />

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-28 bg-card border-border text-foreground h-10 rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-foreground">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-10 rounded-lg text-sm" />
        </div>

        {/* New button */}
        <Button onClick={() => setLocation("/plans/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold text-sm">
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-card hover:bg-card">
                <TableHead className="w-12 pl-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                </TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Duration</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Level</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Price</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Discount</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Total</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide min-w-[160px]">Description</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-xs uppercase tracking-wide text-right pr-5">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-border">
                  <TableCell colSpan={10} className="text-center text-foreground/65 py-14">
                    Loading plans...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={10} className="text-center text-foreground/65 py-14">
                    {searchQuery || statusFilter !== "all"
                      ? "No plans match your filters"
                      : "No plans yet. Click New Plan to create one."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((plan) => (
                  <TableRow key={plan.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-4">
                      <Checkbox checked={selectedIds.includes(plan.id)}
                        onCheckedChange={() => toggleSelect(plan.id)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600" />
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground text-sm">{plan.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded-full bg-muted text-foreground text-xs font-medium border border-border">
                        {durationLabel(plan)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground font-medium text-sm">{plan.level}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatCurrency(plan.price)}
                    </TableCell>
                    <TableCell>
                      {plan.discount > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-green-600/20 text-green-400 text-xs font-semibold border border-green-600/30">
                          {plan.discount}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/80 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground font-semibold text-sm">
                        {formatCurrency(plan.totalPrice)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-foreground/70 text-xs truncate" title={plan.description}>
                        {plan.description || <span className="text-muted-foreground/80">—</span>}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Switch checked={plan.status}
                        onCheckedChange={() => toggleStatus(plan.id, plan.status)}
                        className="data-[state=checked]:bg-primary" />
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setLocation(`/plans/${plan.id}/edit`)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                          title="Edit">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(plan)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
                          title="Delete">
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
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/65">
          Showing {Math.min(paginated.length, PAGE_SIZE)} of {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
          {selectedIds.length > 0 && (
            <span className="ml-2 text-primary font-medium">· {selectedIds.length} selected</span>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1} className="h-8 w-8 p-0 border-border">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages} className="h-8 w-8 p-0 border-border">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent className="bg-card border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground/80">"{confirmDelete?.name}"</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAction}
              className="bg-primary hover:bg-primary/90 text-white border-0">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
