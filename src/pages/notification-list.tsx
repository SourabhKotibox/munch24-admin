
import { useState } from "react";
import { useLocation } from "wouter";
import { Trash2, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useGetNotificationLogs, useDeleteNotificationLog, useBulkDeleteNotificationLogs } from "../lib/api-client";

type Notification = {
  id: string;
  type: string;
  isHighlight: boolean;
  title: string;
  text: string;
  userName: string;
  userEmail: string;
  updatedAt: string;
};

export default function NotificationListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Notification | null>(null);

  const { data: notificationsData, isLoading } = useGetNotificationLogs({ page: 1, limit: 100, type: typeFilter === 'all' ? undefined : typeFilter });
  const deleteMutation = useDeleteNotificationLog();
  const bulkDeleteMutation = useBulkDeleteNotificationLogs();

  const notifications: Notification[] = notificationsData?.data || [];

  const filtered = notifications.filter((n) => {
    const matchType = typeFilter === "all" || n.type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.type.toLowerCase().includes(q) || n.userName.toLowerCase().includes(q) || n.userEmail.toLowerCase().includes(q);
    return matchType && matchSearch;
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
      try {
        await bulkDeleteMutation.mutateAsync(selectedIds);
        setSelectedIds([]);
        toast({ title: `${selectedIds.length} notification(s) deleted` });
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
      toast({ title: "Notification deleted successfully" });
      setConfirmDelete(null);
    } catch {
      toast({ title: "Failed to delete notification", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Notification List</span>
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

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 bg-card border-border text-foreground h-10 rounded-lg">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="user_registered">User Registered</SelectItem>
            <SelectItem value="content_created">Created</SelectItem>
            <SelectItem value="content_updated">Updated</SelectItem>
            <SelectItem value="content_deleted">Deleted</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-10 rounded-lg"
          />
        </div>
      </div>

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
              <TableHead className="text-foreground/70 font-semibold text-sm">Type</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Text</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Target</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">Updated At</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">
                  No notifications found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((notif) => (
                <TableRow key={notif.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(notif.id)}
                      onCheckedChange={() => toggleSelect(notif.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-red-600"
                    />
                  </TableCell>
                  <TableCell>
                    <span className={notif.isHighlight ? "text-primary text-sm font-medium" : "text-muted-foreground text-sm"}>
                      {notif.type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-foreground font-semibold text-sm">{notif.title}</p>
                    <p className="text-foreground/65 text-xs mt-0.5 line-clamp-2">{notif.text}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium text-sm">{notif.userName}</p>
                        <p className="text-foreground/65 text-xs">{notif.userEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {notif.updatedAt ? new Date(notif.updatedAt).toLocaleString() : "Just now"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setConfirmDelete(notif)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete this notification? This action cannot be undone.
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
