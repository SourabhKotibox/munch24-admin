import { useState } from "react";
import {
  Plus, Trash2, Edit2, Gift, Coins, ToggleLeft, ToggleRight,
  Star, Users, Trophy, Share2, UserCheck, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAdminRewardDefinitions,
  useCreateRewardDefinition,
  useUpdateRewardDefinition,
  useDeleteRewardDefinition,
} from "@/lib/api-client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REWARD_TYPES = [
  { value: "daily_login", label: "Daily Login", icon: Star, description: "Users get coins for logging in daily" },
  { value: "signup", label: "Sign Up Bonus", icon: UserCheck, description: "One-time coins for new users" },
  { value: "watch_episodes", label: "Watch Episodes", icon: Users, description: "Earn coins by watching N episodes" },
  { value: "share_content", label: "Share Content", icon: Share2, description: "Earn coins for sharing" },
  { value: "profile_complete", label: "Complete Profile", icon: Trophy, description: "One-time coins for completing profile" },
  { value: "custom", label: "Custom Task", icon: Zap, description: "Custom reward task" },
];

const typeIcon = (type: string) => {
  const found = REWARD_TYPES.find((t) => t.value === type);
  const Icon = found?.icon ?? Gift;
  return <Icon className="h-4 w-4" />;
};

const typeBadgeColor = (type: string) => {
  const map: Record<string, string> = {
    daily_login: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    signup: "bg-green-500/20 text-green-400 border-green-500/30",
    watch_episodes: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    share_content: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    profile_complete: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    custom: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };
  return map[type] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
};

const defaultForm = {
  title: "",
  description: "",
  type: "daily_login",
  coinsReward: "50",
  requiredCount: "1",
  isActive: true,
  isOneTime: false,
  iconUrl: "",
  order: "0",
};

export default function RewardsManagementPage() {
  const { toast } = useToast();
  const { data: rewards = [], isLoading } = useGetAdminRewardDefinitions();
  const createReward = useCreateRewardDefinition();
  const updateReward = useUpdateRewardDefinition();
  const deleteReward = useDeleteRewardDefinition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleOpenModal = (reward: any = null) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        title: reward.title || "",
        description: reward.description || "",
        type: reward.type || "daily_login",
        coinsReward: String(reward.coinsReward ?? 50),
        requiredCount: String(reward.requiredCount ?? 1),
        isActive: reward.isActive ?? true,
        isOneTime: reward.isOneTime ?? false,
        iconUrl: reward.iconUrl || "",
        order: String(reward.order ?? 0),
      });
    } else {
      setEditingReward(null);
      setFormData(defaultForm);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      type: formData.type,
      coinsReward: Number(formData.coinsReward),
      requiredCount: Number(formData.requiredCount),
      isActive: formData.isActive,
      isOneTime: formData.isOneTime,
      iconUrl: formData.iconUrl.trim() || undefined,
      order: Number(formData.order),
    };

    try {
      if (editingReward) {
        await updateReward.mutateAsync({ id: editingReward._id || editingReward.id, ...payload });
        toast({ title: "✅ Reward updated successfully" });
      } else {
        await createReward.mutateAsync(payload);
        toast({ title: "✅ Reward created successfully" });
      }
      setIsModalOpen(false);
    } catch {
      toast({ title: "Failed to save reward", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReward.mutateAsync(deleteTarget._id || deleteTarget.id);
      toast({ title: "🗑️ Reward deleted" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Failed to delete reward", variant: "destructive" });
    }
  };

  const handleToggleActive = async (reward: any) => {
    try {
      await updateReward.mutateAsync({
        id: reward._id || reward.id,
        isActive: !reward.isActive,
      });
      toast({ title: reward.isActive ? "Reward deactivated" : "Reward activated" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const totalCoinsOffered = rewards.reduce((acc: number, r: any) => acc + (r.coinsReward || 0), 0);
  const activeCount = rewards.filter((r: any) => r.isActive).length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-yellow-400" />
            Rewards Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create tasks that reward users with coins when completed
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Create Reward
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Rewards", value: rewards.length, icon: Gift, color: "text-blue-400" },
          { label: "Active", value: activeCount, icon: ToggleRight, color: "text-green-400" },
          { label: "Inactive", value: rewards.length - activeCount, icon: ToggleLeft, color: "text-gray-400" },
          { label: "Total Coins Offered", value: `${totalCoinsOffered.toLocaleString()} 🪙`, icon: Coins, color: "text-yellow-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              {stat.label}
            </div>
            <div className="text-xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading rewards...
          </div>
        ) : rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <Gift className="h-12 w-12 opacity-30" />
            <div className="text-center">
              <p className="font-medium">No rewards yet</p>
              <p className="text-sm mt-1">Create your first reward definition to get started</p>
            </div>
            <Button variant="outline" onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" /> Create First Reward
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50 border-b border-border/50">
                <TableHead className="w-8" />
                <TableHead>Reward</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-yellow-400" /> Coins
                  </span>
                </TableHead>
                <TableHead>Required Count</TableHead>
                <TableHead>One-Time</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rewards.map((reward: any) => {
                const rid = reward._id || reward.id;
                const isExpanded = expandedRows.includes(rid);
                return (
                  <>
                    <TableRow key={rid} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleRow(rid)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{reward.title}</div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${typeBadgeColor(reward.type)}`}
                        >
                          {typeIcon(reward.type)}
                          {REWARD_TYPES.find((t) => t.value === reward.type)?.label ?? reward.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 font-semibold text-yellow-400">
                          <Coins className="h-3.5 w-3.5" />
                          {reward.coinsReward}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{reward.requiredCount ?? 1}</TableCell>
                      <TableCell>
                        {reward.isOneTime ? (
                          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">
                            One-Time
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-sky-500/40 text-sky-400">
                            Recurring
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{reward.order ?? 0}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleActive(reward)}
                          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                          title="Toggle active status"
                        >
                          {reward.isActive ? (
                            <>
                              <ToggleRight className="h-4 w-4 text-green-400" />
                              <span className="text-green-400">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-400">Inactive</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenModal(reward)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteTarget(reward)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${rid}-desc`} className="bg-muted/10 hover:bg-muted/10">
                        <TableCell />
                        <TableCell colSpan={8} className="py-3 text-sm text-muted-foreground italic">
                          {reward.description || "No description provided."}
                          {reward.iconUrl && (
                            <span className="ml-4 text-xs text-primary">
                              Icon: {reward.iconUrl}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Reward Type Reference ── */}
      <div className="rounded-xl border bg-card/50 p-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Reward Type Reference
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REWARD_TYPES.map((rt) => (
            <div key={rt.value} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
              <span className={`mt-0.5 p-1.5 rounded-md ${typeBadgeColor(rt.value)}`}>
                <rt.icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-medium">{rt.label}</p>
                <p className="text-xs text-muted-foreground">{rt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-yellow-400" />
              {editingReward ? "Edit Reward" : "Create Reward"}
            </DialogTitle>
            <DialogDescription>
              Configure a reward task that users can complete to earn coins.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="r-title">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="r-title"
                required
                placeholder="e.g. Watch 5 Episodes"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="r-desc">
                Description <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="r-desc"
                required
                placeholder="What does the user need to do?"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      <span className="flex items-center gap-2">
                        <rt.icon className="h-3.5 w-3.5" />
                        {rt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {REWARD_TYPES.find((t) => t.value === formData.type)?.description}
              </p>
            </div>

            {/* Coins + Required Count */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-coins">
                  <span className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-yellow-400" /> Coins to Award
                    <span className="text-red-400 ml-0.5">*</span>
                  </span>
                </Label>
                <Input
                  id="r-coins"
                  type="number"
                  min="1"
                  required
                  placeholder="50"
                  value={formData.coinsReward}
                  onChange={(e) => setFormData({ ...formData, coinsReward: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-count">Required Count</Label>
                <Input
                  id="r-count"
                  type="number"
                  min="1"
                  value={formData.requiredCount}
                  onChange={(e) => setFormData({ ...formData, requiredCount: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  e.g. "5" for "Watch 5 episodes"
                </p>
              </div>
            </div>

            {/* Order */}
            <div className="space-y-1.5">
              <Label htmlFor="r-order">Display Order</Label>
              <Input
                id="r-order"
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Lower number = shown first in app
              </p>
            </div>

            {/* Icon URL */}
            <div className="space-y-1.5">
              <Label htmlFor="r-icon">Icon URL (optional)</Label>
              <Input
                id="r-icon"
                placeholder="https://... or leave blank for default icon"
                value={formData.iconUrl}
                onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              />
            </div>

            {/* Flags */}
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
                <Checkbox
                  id="r-active"
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v === true })}
                />
                <div>
                  <Label htmlFor="r-active" className="cursor-pointer font-medium">Active</Label>
                  <p className="text-xs text-muted-foreground">Users can see and claim this reward</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
                <Checkbox
                  id="r-onetime"
                  checked={formData.isOneTime}
                  onCheckedChange={(v) => setFormData({ ...formData, isOneTime: v === true })}
                />
                <div>
                  <Label htmlFor="r-onetime" className="cursor-pointer font-medium">One-Time Only</Label>
                  <p className="text-xs text-muted-foreground">
                    User can only claim this once (e.g. signup bonus). Uncheck for recurring rewards.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReward.isPending || updateReward.isPending}
                className="gap-2"
              >
                {(createReward.isPending || updateReward.isPending) ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                {editingReward ? "Update Reward" : "Create Reward"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reward?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span>?
              This action cannot be undone. Existing user claims for this reward will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
