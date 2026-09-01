
import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Download, Search, Filter, DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
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
import { useSettings } from "@/contexts/SettingsContext";
import {
  useBulkDeleteSubscriptions,
  useDeleteSubscription,
  useGetSubscriptionPlans,
  useGetSubscriptions,
} from "@/lib/api-client";

type Subscription = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  plan: string;
  duration: string;
  durationValue: number;
  durationLabel: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  price: number;
  discount: number;
  couponDiscount: number;
  tax: number;
  totalAmount: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export default function SubscriptionsListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const deleteSubscription = useDeleteSubscription();
  const bulkDeleteSubscriptions = useBulkDeleteSubscriptions();
  const { data: plansData } = useGetSubscriptionPlans();
  const { data: subscriptionsData } = useGetSubscriptions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Subscription | null>(null);
  const subscriptions: Subscription[] = subscriptionsData?.data || [];
  const planOptions: string[] = [
    "All Plans",
    ...Array.from<string>(new Set((plansData?.data || []).map((plan: any) => String(plan.name)))),
  ];

  const filtered = subscriptions.filter((s) => {
    const matchPlan = planFilter === "All Plans" || s.plan === planFilter;
    const matchSearch =
      s.plan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFrom = !dateFrom || s.startDate >= dateFrom;
    const matchTo = !dateTo || s.endDate <= dateTo;
    return matchPlan && matchSearch && matchFrom && matchTo;
  });

  const allSelected = filtered.length > 0 && filtered.every((n) => selectedIds.includes(n.id));

  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : filtered.map((n) => n.id));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }

    if (bulkAction === "delete") {
      const confirmed = window.confirm(`Delete ${selectedIds.length} selected subscription(s)?`);
      if (!confirmed) return;

      try {
        await bulkDeleteSubscriptions.mutateAsync(selectedIds);
        setSelectedIds([]);
        toast({ title: `${selectedIds.length} subscription(s) deleted successfully` });
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
      setBulkAction("");
    }
  };

  const handleExport = () => {
    const headers = ["User", "Plan", "Duration", "Payment Method", "Start Date", "End Date", "Price", "Discount", "Coupon Discount", "Tax", "Total Amount", "Status"];
    const rows = filtered.map((s) => [
      s.userName || s.userEmail, s.plan, s.durationLabel, s.paymentMethod, s.startDate, s.endDate,
      s.price, s.discount, s.couponDiscount, s.tax, s.totalAmount, s.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteSubscription.mutateAsync(confirmDelete.id);
    toast({ title: `Subscription deleted successfully` });
    setConfirmDelete(null);
  };

  const { settings } = useSettings();
  const fmt = (n: number) => settings.currencyPosition === "before" ? `${settings.currencySymbol}${n.toFixed(settings.decimalPlaces)}` : `${n.toFixed(settings.decimalPlaces)} ${settings.currencySymbol}`;

  // Computed stats from subscriptions
  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const totalRevenue = subscriptions.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const activeRevenue = subscriptions.filter((s) => s.status === "active").reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const summaryStats = [
    { label: "Total Subscriptions", value: subscriptions.length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Active", value: activeCount, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Total Revenue", value: fmt(totalRevenue), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Revenue", value: fmt(activeRevenue), icon: CreditCard, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
        <span className="text-muted-foreground/60">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Subscriptions</span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-black text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Bulk Action */}
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

        {/* Export */}
        <Button
          variant="outline"
          onClick={handleExport}
          className="border-border text-foreground hover:bg-muted hover:text-foreground h-10 gap-2 rounded-lg"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>

        {/* Plan Filter */}
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-36 bg-card border-border text-foreground h-10 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            {planOptions.map((p: string) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 bg-card border-border text-foreground h-10 rounded-lg text-sm"
          />
          <span className="text-foreground/65 text-sm">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 bg-card border-border text-foreground h-10 rounded-lg text-sm"
          />
        </div>

        {/* Filter Button */}
        <Button
          onClick={() => {}}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-4"
        >
          <Filter className="h-4 w-4" />
          Filter
        </Button>

        <div className="flex-1" />

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

        {/* New Button */}
        <Button
          onClick={() => setLocation("/subscriptions/new")}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
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
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">User</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Plan</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Duration</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Payment Method</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Start Date</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">End Date</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Price</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Discount</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Coupon Discount</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Tax</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Total Amount</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Status</TableHead>
                <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-foreground/65 py-10">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub) => (
                  <TableRow key={sub.id} className="border-border hover:bg-muted/40">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(sub.id)}
                        onCheckedChange={() => toggleSelect(sub.id)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                      />
                    </TableCell>
                    <TableCell className="text-foreground font-medium whitespace-nowrap">{sub.userName || sub.userEmail}</TableCell>
                    <TableCell className="text-foreground font-medium whitespace-nowrap">{sub.plan}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{sub.durationLabel}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{sub.paymentMethod}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{sub.startDate}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{sub.endDate}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{fmt(sub.price)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{fmt(sub.discount)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{fmt(sub.couponDiscount)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{fmt(sub.tax)}</TableCell>
                    <TableCell className="text-foreground font-semibold whitespace-nowrap">{fmt(sub.totalAmount)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          sub.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {sub.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLocation(`/subscriptions/${sub.id}/edit`)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-blue-400 hover:bg-primary/80/30 transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(sub)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
                          title="Delete"
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
      </div>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete this subscription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
