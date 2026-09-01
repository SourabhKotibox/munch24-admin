import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  useGetPlanLimits,
  useDeletePlanLimit,
  useBulkDeletePlanLimits,
} from "@/lib/api-client";

type PlanLimit = {
  id: string;
  planName: string;
  videoCast: boolean;
  ads: boolean;
  deviceLimit: boolean;
  deviceLimitCount: number;
  downloadStatus: boolean;
  profileLimit: boolean;
  profileLimitCount: number;
};

export default function PlanLimitsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: limitsData, isLoading } = useGetPlanLimits();
  const deletePlanLimit = useDeletePlanLimit();
  const bulkDeletePlanLimits = useBulkDeletePlanLimits();
  
  const limits = limitsData?.data || [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkAction, setBulkAction] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<PlanLimit | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState("10");

  const filtered = limits.filter((p: PlanLimit) =>
    p.planName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete") {
      await bulkDeletePlanLimits.mutateAsync(selectedIds);
      setSelectedIds([]);
      toast({ title: `${selectedIds.length} plan limit(s) deleted` });
    }
    setBulkAction("");
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    await deletePlanLimit.mutateAsync(confirmDelete.id);
    setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
    toast({ title: `Plan limit deleted successfully` });
    setConfirmDelete(null);
  };

  const StatusPill = ({ active }: { active: boolean }) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
        active
          ? "border-green-700/40 bg-green-600/20 text-green-400"
          : "border-red-700/40 bg-primary/20 text-primary"
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${active ? "bg-green-400" : "bg-red-400"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading plan limits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Plan Limits</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Show entries */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
            <SelectTrigger className="w-20 bg-card border-border text-foreground h-10 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border text-foreground">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>

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
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary h-10 rounded-lg"
          />
        </div>

        {/* New button */}
        <Button
          onClick={() => setLocation("/plan-limits/new")}
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
                  Plan Name
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/65" />
                </div>
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm">
                <div className="flex items-center gap-1">
                  Video Cast
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/65" />
                </div>
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm">
                <div className="flex items-center gap-1">
                  Ads
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/65" />
                </div>
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm">
                <div className="flex items-center gap-1">
                  Device Limit
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/65" />
                </div>
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm">
                <div className="flex items-center gap-1">
                  Download Status
                  <ChevronDown className="h-3.5 w-3.5 text-foreground/65" />
                </div>
              </TableHead>
              <TableHead className="text-foreground font-semibold text-sm">
                <div className="flex items-center gap-1">
                  Profile Limit
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
                <TableCell colSpan={8} className="text-center text-foreground/65 py-16">
                  No plan limits found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-border hover:bg-card/60 transition-colors"
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{item.planName}</TableCell>
                  <TableCell>
                    <StatusPill active={item.videoCast} />
                  </TableCell>
                  <TableCell>
                    <StatusPill active={item.ads} />
                  </TableCell>
                  <TableCell className="text-foreground">{item.deviceLimit ? item.deviceLimitCount : "—"}</TableCell>
                  <TableCell>
                    <StatusPill active={item.downloadStatus} />
                  </TableCell>
                  <TableCell className="text-foreground">{item.profileLimit ? item.profileLimitCount : "—"}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLocation(`/plan-limits/${item.id}/edit`)}
                        className="h-8 w-8 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmDelete(item)}
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

      {/* Footer */}
      <p className="text-sm text-foreground/65">
        Showing {filtered.length} of {limits.length} plan limits
      </p>

      {/* Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent className="bg-card border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Plan Limit</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this plan limit?
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
