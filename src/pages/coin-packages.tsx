import { useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetCoinPackages,
  useCreateCoinPackage,
  useUpdateCoinPackage,
  useDeleteCoinPackage,
} from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";

export default function CoinPackagesPage() {
  const { toast } = useToast();
  const { data: packagesData, isLoading } = useGetCoinPackages();
  const createPackage = useCreateCoinPackage();
  const updatePackage = useUpdateCoinPackage();
  const deletePackage = useDeleteCoinPackage();
  const { settings } = useSettings();

  const packages = packagesData?.data || [];

  const formatCurrency = (amount: number) => {
    const sym = settings.currencySymbol || "₹";
    const dp = settings.decimalPlaces ?? 2;
    return settings.currencyPosition === "after"
      ? `${amount.toFixed(dp)} ${sym}`
      : `${sym}${amount.toFixed(dp)}`;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [formData, setFormData] = useState({
    price: "",
    coins: "",
    bonusCoins: "0",
    label: "",
    isActive: true,
  });

  const handleOpenModal = (pkg: any = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        price: pkg.price.toString(),
        coins: pkg.coins.toString(),
        bonusCoins: (pkg.bonusCoins || 0).toString(),
        label: pkg.label || "",
        isActive: pkg.isActive,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        price: "",
        coins: "",
        bonusCoins: "0",
        label: "",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      price: Number(formData.price),
      coins: Number(formData.coins),
      bonusCoins: Number(formData.bonusCoins),
      label: formData.label,
      isActive: formData.isActive,
    };

    try {
      if (editingPackage) {
        await updatePackage.mutateAsync({ id: editingPackage._id || editingPackage.id, ...payload });
        toast({ title: "Package updated successfully" });
      } else {
        await createPackage.mutateAsync(payload);
        toast({ title: "Package created successfully" });
      }
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Failed to save package", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      try {
        await deletePackage.mutateAsync(id);
        toast({ title: "Package deleted successfully" });
      } catch (error) {
        toast({ title: "Failed to delete package", variant: "destructive" });
      }
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coin Packages</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Add Package
        </Button>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead>Price</TableHead>
              <TableHead>Coins</TableHead>
              <TableHead>Bonus Coins</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((pkg: any) => (
              <TableRow key={pkg._id || pkg.id} className="hover:bg-muted/50">
                <TableCell>{formatCurrency(pkg.price)}</TableCell>
                <TableCell>{pkg.coins}</TableCell>
                <TableCell>{pkg.bonusCoins}</TableCell>
                <TableCell>{pkg.label || "-"}</TableCell>
                <TableCell>{pkg.isActive ? "Active" : "Inactive"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal(pkg)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg._id || pkg.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No coin packages found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Price ({settings.currencySymbol || "₹"})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Coins</Label>
              <Input
                type="number"
                min="1"
                required
                value={formData.coins}
                onChange={(e) => setFormData({ ...formData, coins: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bonus Coins</Label>
              <Input
                type="number"
                min="0"
                value={formData.bonusCoins}
                onChange={(e) => setFormData({ ...formData, bonusCoins: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Label (e.g. Best Value)</Label>
              <Input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked === true })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPackage ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
