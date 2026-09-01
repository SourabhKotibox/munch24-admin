import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Edit2, Trash2, Globe, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useGetLanguagesList, useCreateLanguage, useUpdateLanguage, useDeleteLanguage, getImageUrl } from "../lib/api-client";
import MediaPicker from "@/components/MediaPicker";

export default function LanguagesList() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", code: "", image: "" });
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateLanguage();
  const updateMutation = useUpdateLanguage();
  const deleteMutation = useDeleteLanguage();

  const { data, isLoading } = useGetLanguagesList();

  const filteredLanguages = data?.data?.filter((lang: any) =>
    lang.name.toLowerCase().includes(search.toLowerCase()) ||
    lang.code.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreate = () => {
    setEditingLanguage(null);
    setFormData({ name: "", code: "", image: "" });
    setDialogOpen(true);
  };

  const openEdit = (lang: any) => {
    setEditingLanguage(lang);
    setFormData({ name: lang.name, code: lang.code, image: lang.image || "" });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLanguage(null);
    setFormData({ name: "", code: "", image: "" });
  };

  const handleSave = () => {
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("code", formData.code);
    if (formData.image) fd.append("image", formData.image);

    if (editingLanguage) {
      updateMutation.mutate(
        { id: editingLanguage.id, data: fd },
        {
          onSuccess: () => {
            toast({ title: "Language updated successfully" });
            closeDialog();
            queryClient.invalidateQueries({ queryKey: ["languages-list"] });
          },
          onError: () => toast({ title: "Failed to update language", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate({ data: fd }, {
        onSuccess: () => {
          toast({ title: "Language created successfully" });
          closeDialog();
          queryClient.invalidateQueries({ queryKey: ["languages-list"] });
        },
        onError: () => toast({ title: "Failed to create language", variant: "destructive" }),
      });
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast({ title: "Language deleted successfully" });
        setConfirmDelete(null);
        queryClient.invalidateQueries({ queryKey: ["languages-list"] });
      },
      onError: () => {
        toast({ title: "Failed to delete language", variant: "destructive" });
        setConfirmDelete(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Languages</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search languages..."
            className="pl-9 w-52 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-10 rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-white h-10 gap-2 rounded-lg px-5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="text-foreground/70 font-semibold text-sm">Language</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Code</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Status</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-foreground/65 py-10">
                  Loading languages...
                </TableCell>
              </TableRow>
            ) : filteredLanguages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-foreground/65 py-10">
                  No languages found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLanguages.map((lang: any) => (
                <TableRow key={lang.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-lg border border-border">
                        {lang.image ? (
                          <AvatarImage src={getImageUrl(lang.image)} alt={lang.name} />
                        ) : (
                          <AvatarFallback className="bg-muted text-foreground/70 rounded-lg">
                            <Globe className="h-4 w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-foreground font-medium text-sm">{lang.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground uppercase">
                      {lang.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lang.isActive
                          ? "bg-green-500/15 text-green-400"
                          : "bg-muted text-foreground/70"
                      }`}
                    >
                      {lang.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(lang)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(lang)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/80/30 transition-colors disabled:opacity-40"
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingLanguage ? "Edit Language" : "Add Language"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-foreground/70 text-sm">Name</Label>
              <Input
                placeholder="e.g. English"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/70 text-sm">Code</Label>
              <Input
                placeholder="e.g. en"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/70 text-sm">Image</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMediaPickerOpen(true)}
                  className="bg-muted border-border text-foreground hover:bg-muted h-11 px-4 rounded-lg font-semibold text-sm gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Select from Media Library
                </Button>
                {formData.image && (
                  <div className="relative h-11 w-11 rounded-lg overflow-hidden border border-border bg-gray-800 shrink-0">
                    <img
                      src={getImageUrl(formData.image)}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: "" })}
                      className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              className="bg-muted border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              {editingLanguage ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Language</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/70">
              Are you sure you want to delete "{confirmDelete?.name}"? This action cannot be undone.
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

      {/* Media Picker */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(media) => {
          setFormData({ ...formData, image: media.filePath });
          setMediaPickerOpen(false);
        }}
        source="language"
        accept="image/*"
      />
    </div>
  );
}
