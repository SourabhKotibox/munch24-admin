import { useState, useMemo, useCallback } from "react";
import {
  Folder, FolderPlus, Trash2, Search, ChevronLeft, Upload, ImageIcon,
  Video, Loader2, Filter, Copy, Check, ChevronRight, LayoutGrid, List, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetMediaFolders,
  useGetMediaFilesByFolder,
  useUploadMediaFiles,
  useDeleteMediaFile,
  useDeleteMediaFolder,
  useGetAllMediaFiles,
  useCreateMediaFolder,
  getImageUrl,
} from "@/lib/api-client";

const PAGE_LIMIT = 50;

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "movie", label: "Movie" },
  { value: "show", label: "Show" },
  { value: "tv-show", label: "TV Show" },
  { value: "banner", label: "Banner" },
  { value: "genre", label: "Genre" },
  { value: "actor", label: "Actor" },
  { value: "director", label: "Director" },
  { value: "language", label: "Language" },
  { value: "promotion", label: "Promotion" },
  { value: "media-library", label: "Media Library" },
  { value: "category", label: "Category" },
];

export default function MediaLibraryPage() {
  const { toast } = useToast();

  // View & navigation
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ _id: string; name: string }[]>([]);
  const [previewMedia, setPreviewMedia] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"folders" | "all">("folders");
  const [gridView, setGridView] = useState<"grid" | "list">("grid");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("");
  const [allMediaPage, setAllMediaPage] = useState(1);

  // Dialogs
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; type: "file" | "folder" } | null>(null);
  const [duplicateFiles, setDuplicateFiles] = useState<{ existing: any; new: File }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Queries
  const foldersQuery = useGetMediaFolders(selectedFolder || undefined);
  const filesQuery = useGetMediaFilesByFolder(selectedFolder || "");
  const allFilesQuery = useGetAllMediaFiles({
    page: allMediaPage,
    limit: PAGE_LIMIT,
    source: sourceFilter || undefined,
    fileType: fileTypeFilter || undefined,
    search: searchQuery || undefined,
  });

  // Mutations
  const uploadFilesMutation = useUploadMediaFiles();
  const deleteFileMutation = useDeleteMediaFile();
  const deleteFolderMutation = useDeleteMediaFolder();
  const createFolderMutation = useCreateMediaFolder();

  const folders = foldersQuery.data?.data || [];
  const allFilesData = allFilesQuery.data;
  const allFiles = allFilesData?.data || [];
  const allFilesTotal = allFilesData?.total || allFiles.length;
  const allFilesTotalPages = Math.max(1, Math.ceil(allFilesTotal / PAGE_LIMIT));

  const currentFiles = useMemo(() => {
    if (viewMode === "all") return allFiles;
    if (!selectedFolder) return [];
    const folderFiles = filesQuery.data?.data || [];
    if (!searchQuery.trim()) return folderFiles;
    return folderFiles.filter((f: any) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [viewMode, selectedFolder, filesQuery.data, allFiles, searchQuery]);

  const handleFolderClick = (folderId: string, folderName: string) => {
    setSelectedFolder(folderId);
    setFolderPath(prev => {
      if (prev.some(f => f._id === folderId)) return prev;
      return [...prev, { _id: folderId, name: folderName }];
    });
    setViewMode("folders");
    setSearchQuery("");
  };

  const handleBreadcrumbClick = (idx: number) => {
    if (idx === -1) {
      setSelectedFolder(null);
      setFolderPath([]);
    } else {
      const target = folderPath[idx];
      setSelectedFolder(target._id);
      setFolderPath(folderPath.slice(0, idx + 1));
    }
    setViewMode("folders");
    setSearchQuery("");
  };

  const handleBack = () => {
    if (folderPath.length <= 1) {
      setSelectedFolder(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, -1);
      const parent = newPath[newPath.length - 1];
      setSelectedFolder(parent._id);
      setFolderPath(newPath);
    }
    setSearchQuery("");
  };

  const handleViewModeChange = (mode: "folders" | "all") => {
    setViewMode(mode);
    setSelectedFolder(null);
    setFolderPath([]);
    setSearchQuery("");
    setSourceFilter("");
    setFileTypeFilter("");
    setAllMediaPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "file") {
        await deleteFileMutation.mutateAsync(confirmDelete.id);
      } else {
        await deleteFolderMutation.mutateAsync(confirmDelete.id);
        setSelectedFolder(null);
      }
      toast({ title: `${confirmDelete.type.charAt(0).toUpperCase() + confirmDelete.type.slice(1)} deleted.` });
    } catch (error: any) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedFolder) return;
    const selectedFiles = Array.from(files);
    const folderFiles = filesQuery.data?.data || [];
    const duplicates: { existing: any; new: File }[] = [];
    const uniqueFiles: File[] = [];

    selectedFiles.forEach((newFile) => {
      const existing = folderFiles.find((f: any) => f.name === newFile.name);
      if (existing) {
        duplicates.push({ existing, new: newFile });
      } else {
        uniqueFiles.push(newFile);
      }
    });

    if (duplicates.length > 0) {
      setDuplicateFiles(duplicates);
      setPendingFiles(uniqueFiles);
      setDuplicateDialogOpen(true);
    } else {
      await uploadSelectedFiles(selectedFiles);
    }
    event.target.value = "";
  };

  const uploadSelectedFiles = async (files: File[]) => {
    if (!selectedFolder) return;
    try {
      await uploadFilesMutation.mutateAsync({ folderId: selectedFolder, files });
      toast({ title: `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully!` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDuplicateConfirm = async () => {
    await uploadSelectedFiles([...pendingFiles, ...duplicateFiles.map((d) => d.new)]);
    setDuplicateDialogOpen(false);
    setDuplicateFiles([]);
    setPendingFiles([]);
  };

  const handleDuplicateCancel = async () => {
    if (pendingFiles.length > 0) await uploadSelectedFiles(pendingFiles);
    else toast({ title: "No unique files to upload." });
    setDuplicateDialogOpen(false);
    setDuplicateFiles([]);
    setPendingFiles([]);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
        parentFolder: selectedFolder || undefined
      });
      toast({ title: `Folder "${newFolderName.trim()}" created.` });
      setCreateFolderOpen(false);
      setNewFolderName("");
    } catch (error: any) {
      toast({ title: "Failed to create folder", description: error.message, variant: "destructive" });
    }
  };

  const handleCopyUrl = useCallback((file: any) => {
    const url = getImageUrl(file.filePath || file.url);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(file._id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const isLoading =
    foldersQuery.isLoading ||
    filesQuery.isLoading ||
    allFilesQuery.isLoading ||
    uploadFilesMutation.isPending ||
    deleteFileMutation.isPending ||
    deleteFolderMutation.isPending;

  const currentFolderName = folders.find((f: any) => f._id === selectedFolder)?.name || "";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="hover:text-foreground transition-colors font-medium"
            >
              Media Library
            </button>
            {folderPath.map((folder, idx) => (
              <span key={folder._id} className="flex items-center gap-2">
                <span>/</span>
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-foreground transition-colors font-medium ${
                    idx === folderPath.length - 1 ? "text-foreground font-semibold" : ""
                  }`}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {selectedFolder ? folderPath[folderPath.length - 1]?.name : "Media Library"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {selectedFolder
              ? `${folderPath[folderPath.length - 1]?.name} — ${currentFiles.length} files`
              : viewMode === "all"
              ? `All Media — ${allFilesTotal} files`
              : `${folders.length} folders`}
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === "folders" && (
            <Button
              variant="outline"
              onClick={() => setCreateFolderOpen(true)}
              className="border-border text-foreground hover:bg-muted gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              New Folder
            </Button>
          )}
          {selectedFolder && (
            <>
              <Button className="bg-gradient-to-r from-red-700 to-red-500 hover:from-red-800 hover:to-red-600 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Upload Files
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  setConfirmDelete({ id: selectedFolder, name: folderPath[folderPath.length - 1]?.name || "", type: "folder" })
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Folder
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border flex gap-6 items-center">
        {["folders", "all"].map((m) => (
          <button
            key={m}
            onClick={() => handleViewModeChange(m as "folders" | "all")}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors capitalize ${
              viewMode === m
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {m === "folders" ? "Folders" : "All Media"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {/* ── FOLDER VIEW ── */}
      {viewMode === "folders" && !selectedFolder && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* Create folder card */}
          <button
            onClick={() => setCreateFolderOpen(true)}
            className="group flex flex-col items-center justify-center gap-3 p-5 bg-muted/20 border-2 border-dashed border-border rounded-xl hover:border-primary/40 hover:bg-muted/30 transition-all duration-200 cursor-pointer"
          >
            <FolderPlus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">New Folder</span>
          </button>

          {folders.map((folder: any) => (
            <button
              key={folder._id}
              onClick={() => handleFolderClick(folder._id, folder.name)}
              className="group flex flex-col items-center justify-center gap-3 p-5 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-muted transition-all duration-200 cursor-pointer"
            >
              <Folder className="h-11 w-11 text-primary fill-red-500/20 group-hover:fill-red-500/40 transition-all duration-200" />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-all duration-200 text-center leading-tight">
                {folder.name}
              </span>
              <span className="text-xs text-muted-foreground">{folder.count || 0} files</span>
            </button>
          ))}
        </div>
      )}

      {/* ── FILES VIEW (folder OR all media) ── */}
      {(selectedFolder || viewMode === "all") && !isLoading && (
        <div className="space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">
              {selectedFolder ? (folderPath[folderPath.length - 1]?.name || "") : "All Media"}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-9 rounded-lg text-sm"
                />
              </div>

              {/* Source filter (All Media only) */}
              {viewMode === "all" && (
                <>
                  <Select
                    value={sourceFilter || "all"}
                    onValueChange={(v) => { setSourceFilter(v === "all" ? "" : v); setAllMediaPage(1); }}
                  >
                    <SelectTrigger className="w-36 bg-card border-border text-foreground h-9 rounded-lg text-sm">
                      <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-foreground">
                      {SOURCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={fileTypeFilter || "all"}
                    onValueChange={(v) => { setFileTypeFilter(v === "all" ? "" : v); setAllMediaPage(1); }}
                  >
                    <SelectTrigger className="w-32 bg-card border-border text-foreground h-9 rounded-lg text-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-foreground">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="image">
                        <span className="flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" />Images</span>
                      </SelectItem>
                      <SelectItem value="video">
                        <span className="flex items-center gap-2"><Video className="h-3.5 w-3.5" />Videos</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Grid/List toggle */}
              <div className="flex bg-muted border border-border rounded-lg p-0.5">
                <button
                  onClick={() => setGridView("grid")}
                  className={`p-1.5 rounded-md transition-colors ${gridView === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setGridView("list")}
                  className={`p-1.5 rounded-md transition-colors ${gridView === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Back button for folder view */}
              {selectedFolder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="border-border text-foreground hover:bg-muted h-9 gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
          </div>

          {/* Subfolders Grid if inside a parent folder */}
          {selectedFolder && folders.length > 0 && (
            <div className="space-y-2 pb-4 border-b border-border">
              <h3 className="text-sm font-semibold text-muted-foreground">Subfolders</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {folders.map((folder: any) => (
                  <button
                    key={folder._id}
                    onClick={() => handleFolderClick(folder._id, folder.name)}
                    className="group flex flex-col items-center justify-center gap-2 p-4 bg-muted/40 border border-border rounded-xl hover:border-primary/50 hover:bg-muted/70 transition-all duration-200 cursor-pointer"
                  >
                    <Folder className="h-8 w-8 text-primary fill-red-500/20 group-hover:fill-red-500/40 transition-all duration-200" />
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-all duration-200 text-center leading-tight truncate w-full px-1">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{folder.count || 0} files</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {currentFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
              <ImageIcon className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">
                {searchQuery || sourceFilter || fileTypeFilter
                  ? "No files matching your filters"
                  : selectedFolder
                  ? "No files in this folder"
                  : "No media files found"}
              </p>
              {(searchQuery || sourceFilter || fileTypeFilter) && (
                <button
                  onClick={() => { setSearchQuery(""); setSourceFilter(""); setFileTypeFilter(""); }}
                  className="text-xs text-primary hover:text-primary/80 font-semibold"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : gridView === "grid" ? (
            /* GRID VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {currentFiles.map((file: any) => (
                <div key={file._id} className="group flex flex-col gap-2">
                  <div className="relative rounded-xl overflow-hidden bg-muted border border-border aspect-[4/3] hover:border-primary/50 transition-all duration-200">
                    {file.fileType?.startsWith("video") ? (
                      <video
                        src={`${getImageUrl(file.filePath || file.url)}#t=0.5`}
                        preload="metadata"
                        className="w-full h-full object-contain bg-zinc-800"
                      />
                    ) : (
                      <img
                        src={getImageUrl(file.filePath || file.url)}
                        alt={file.name}
                        className="w-full h-full object-contain bg-zinc-800"
                        loading="lazy"
                      />
                    )}

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleCopyUrl(file)}
                        className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-foreground transition-colors"
                        title="Copy URL"
                      >
                        {copiedId === file._id ? (
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setPreviewMedia(file)}
                        className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-foreground transition-colors"
                        title="Preview File"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: file._id, name: file.name, type: "file" })}
                        disabled={deleteFileMutation.isPending}
                        className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 flex items-center justify-center text-white transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* File info */}
                  <div className="px-0.5 space-y-0.5">
                    <p className="text-xs text-foreground truncate font-medium leading-tight" title={file.name}>
                      {file.name}
                    </p>
                    {file.contentName && (
                      <p className="text-[10px] text-primary truncate font-semibold" title={file.contentName}>
                        🎬 {file.contentName}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                      {file.source && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">
                          {file.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">File</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Size</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentFiles.map((file: any, idx: number) => (
                    <tr key={file._id} className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                            {file.fileType?.startsWith("video") ? (
                              <video src={`${getImageUrl(file.filePath || file.url)}#t=0.5`} preload="metadata" className="w-full h-full object-cover" />
                            ) : (
                              <img src={getImageUrl(file.filePath || file.url)} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground truncate max-w-[160px]" title={file.name}>{file.name}</span>
                            {file.contentName && (
                              <span className="text-[10px] text-primary truncate max-w-[160px] font-semibold">🎬 {file.contentName}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell capitalize">
                        {file.fileType?.startsWith("video") ? "Video" : "Image"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {file.source && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">{file.source}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{file.size || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleCopyUrl(file)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Copy URL"
                          >
                            {copiedId === file._id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => setPreviewMedia(file)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Preview File"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: file._id, name: file.name, type: "file" })}
                            className="p-1.5 rounded-lg text-primary hover:text-red-300 hover:bg-primary/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination (All Media view only) */}
          {viewMode === "all" && allFilesTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {allMediaPage} of {allFilesTotalPages} · {allFilesTotal} total files
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllMediaPage((p) => Math.max(1, p - 1))}
                  disabled={allMediaPage === 1}
                  className="border-border h-8 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                {/* Page numbers (show up to 5) */}
                {Array.from({ length: Math.min(5, allFilesTotalPages) }, (_, i) => {
                  const start = Math.max(1, allMediaPage - 2);
                  const page = start + i;
                  if (page > allFilesTotalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setAllMediaPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                        page === allMediaPage
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllMediaPage((p) => Math.min(allFilesTotalPages, p + 1))}
                  disabled={allMediaPage === allFilesTotalPages}
                  className="border-border h-8 gap-1"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent className="bg-card border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.type}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground/80">"{confirmDelete?.name}"</span>?{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-primary hover:bg-primary/90 border-0">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate File Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Duplicate Files Detected</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              These files already exist in the folder:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-56 overflow-y-auto space-y-2 my-2">
            {duplicateFiles.map(({ existing, new: newFile }, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {existing.fileType?.startsWith("video") ? (
                  <video src={`${getImageUrl(existing.filePath || existing.url)}#t=0.5`} preload="metadata" className="h-11 w-11 rounded object-contain bg-zinc-800" />
                ) : (
                  <img src={getImageUrl(existing.filePath || existing.url)} alt={existing.name} className="h-11 w-11 rounded object-contain bg-zinc-800" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{existing.name}</p>
                  <p className="text-xs text-foreground/65">New: {newFile.type}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDuplicateCancel}>Skip Duplicates</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleDuplicateConfirm}>Upload Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="bg-card border border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter a name for the new media folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className="bg-muted border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-11"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateFolderOpen(false); setNewFolderName(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createFolderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* File Preview Dialog */}
      <Dialog open={!!previewMedia} onOpenChange={(open) => { if (!open) setPreviewMedia(null); }}>
        <DialogContent className="bg-card border border-border text-foreground max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="text-lg font-bold truncate pr-6">{previewMedia?.name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Uploaded on {previewMedia?.createdAt ? new Date(previewMedia.createdAt).toLocaleString() : '—'}
            </DialogDescription>
          </DialogHeader>

          {previewMedia && (
            <>
              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
                {/* Media viewport */}
                <div className="rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center max-h-[300px] aspect-video">
                  {previewMedia.fileType?.startsWith("video") ? (
                    <video
                      src={getImageUrl(previewMedia.filePath || previewMedia.url)}
                      controls
                      className="w-full h-full object-contain max-h-[300px] bg-black"
                    />
                  ) : (
                    <img
                      src={getImageUrl(previewMedia.filePath || previewMedia.url)}
                      alt={previewMedia.name}
                      className="w-full h-full object-contain max-h-[300px]"
                    />
                  )}
                </div>

                {/* Metadata Details */}
                <div className="grid grid-cols-2 gap-3 text-xs p-4 bg-muted/30 border border-border rounded-xl">
                  <div>
                    <p className="text-muted-foreground font-medium">File Size</p>
                    <p className="font-semibold text-foreground mt-0.5">{previewMedia.size || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium">File Type</p>
                    <p className="font-semibold text-foreground mt-0.5 capitalize">{previewMedia.fileType || '—'}</p>
                  </div>
                  {previewMedia.contentName && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground font-medium">Associated Content</p>
                      <p className="font-bold text-primary mt-0.5">🎬 {previewMedia.contentName} ({previewMedia.contentType || 'unknown'})</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-muted-foreground font-medium">Relative File Path</p>
                    <p className="font-mono bg-muted/60 p-1.5 rounded border border-border/40 text-[10px] text-foreground break-all mt-0.5">{previewMedia.filePath}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground font-medium">Full URL</p>
                    <p className="font-mono bg-muted/60 p-1.5 rounded border border-border/40 text-[10px] text-foreground break-all mt-0.5">{getImageUrl(previewMedia.filePath || previewMedia.url)}</p>
                  </div>
                </div>
              </div>

              {/* Pinned Footer Actions */}
              <div className="px-6 py-4 border-t border-border flex gap-2 justify-end bg-card shrink-0">
                <Button
                  variant="outline"
                  onClick={() => handleCopyUrl(previewMedia)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  {copiedId === previewMedia._id ? (
                    <span className="flex items-center gap-1.5 text-green-400 font-semibold"><Check className="h-4 w-4" /> Copied!</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Copy className="h-4 w-4" /> Copy URL</span>
                  )}
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = getImageUrl(previewMedia.filePath || previewMedia.url);
                    link.download = previewMedia.name;
                    link.target = '_blank';
                    link.click();
                  }}
                >
                  Open in New Tab
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
