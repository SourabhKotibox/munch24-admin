import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Video, X, Loader2, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGetAllMediaFiles, uploadMediaFiles, getMediaFolders, createMediaFolder } from "@/lib/api-client";
import { getImageUrl } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: any) => void;
  source: string;
  accept?: string;
}

type FileTypeFilter = "all" | "image" | "video";

export default function MediaPicker({ open, onClose, onSelect, source, accept = "image/*,video/*" }: MediaPickerProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"library" | "upload">("library");
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeTab, setFileTypeTab] = useState<FileTypeFilter>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive the accept-based default filter
  const defaultFileType: FileTypeFilter = (() => {
    if (accept.includes("image/*") && !accept.includes("video/*")) return "image";
    if (accept.includes("video/*") && !accept.includes("image/*")) return "video";
    return "all";
  })();

  // Use the tab selection, but if accept constrains to one type, lock to it
  const effectiveFileType = defaultFileType !== "all" ? defaultFileType : (fileTypeTab !== "all" ? fileTypeTab : undefined);

  const { data: allMediaData, isLoading: mediaLoading, refetch: refetchMedia } = useGetAllMediaFiles({
    page: 1,
    limit: 100,
    search: searchQuery || undefined,
    fileType: effectiveFileType,
    // No source filter — show ALL media from library regardless of where it was uploaded from
  });

  const allMedia = allMediaData?.data || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setSelectedMedia({ name: file.name, file, isLocal: true });
  };

  const handleConfirm = async () => {
    if (mode === "library" && selectedMedia) {
      // Pass the entire media object
      onSelect({
        ...selectedMedia,
        url: getImageUrl(selectedMedia.filePath || selectedMedia.url),
        filePath: selectedMedia.filePath || selectedMedia.url,
      });
      handleClose();
    } else if (mode === "upload" && selectedMedia?.file) {
      setUploading(true);
      try {
        const folders = await getMediaFolders();
        let folderId = folders?.data?.find((f: any) =>
          f.name.toLowerCase() === source.toLowerCase()
        )?._id;

        if (!folderId) {
          const newFolder = await createMediaFolder(source);
          folderId = newFolder?.data?._id;
        }

        if (!folderId) throw new Error("Failed to create or find folder");

        const result = await uploadMediaFiles(folderId, [selectedMedia.file], source);
        await refetchMedia();
        toast({ title: "File uploaded successfully!" });

        const uploadedFile = result?.data?.[0];
        if (uploadedFile) {
          // Pass the entire uploaded file
          onSelect({
            ...uploadedFile,
            url: getImageUrl(uploadedFile.filePath || uploadedFile.url),
            filePath: uploadedFile.filePath || uploadedFile.url,
          });
        } else {
          onSelect({ url: preview || "", filePath: "", name: selectedMedia.name });
        }
        handleClose();
      } catch (error: any) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleClose = () => {
    setMode("library");
    setSelectedMedia(null);
    setPreview(null);
    setSearchQuery("");
    setFileTypeTab("all");
    onClose();
  };

  const filteredMedia = allMedia.filter((media: any) =>
    !searchQuery || media.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showFileTypeTabs = defaultFileType === "all";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-foreground text-lg font-bold">Select Media</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 flex flex-col gap-4 flex-1 overflow-hidden min-h-0">
          {/* Mode tabs */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setMode("library")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "library"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              Media Library
            </button>
            <button
              onClick={() => setMode("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "upload"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload New
            </button>
          </div>

          {/* Library mode */}
          {mode === "library" && (
            <div className="flex flex-col gap-3 flex-1 overflow-hidden min-h-0">
              {/* Search + File type filter */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 bg-muted border border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-9 rounded-lg text-sm outline-none transition-colors"
                  />
                </div>
                {showFileTypeTabs && (
                  <div className="flex items-center bg-muted border border-border rounded-lg p-0.5 shrink-0">
                    {(["all", "image", "video"] as FileTypeFilter[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFileTypeTab(t)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          fileTypeTab === t
                            ? "bg-primary text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "image" && <ImageIcon className="h-3.5 w-3.5" />}
                        {t === "video" && <Video className="h-3.5 w-3.5" />}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* File count */}
              {!mediaLoading && (
                <p className="text-xs text-foreground/65 font-medium shrink-0">
                  {filteredMedia.length} file{filteredMedia.length !== 1 ? "s" : ""} found
                </p>
              )}

              {/* Grid */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1" style={{ scrollbarWidth: "none" }}>
                {mediaLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-foreground/65 gap-3">
                    <ImageIcon className="h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium">
                      {searchQuery ? "No matching files found" : "No files in media library yet"}
                    </p>
                    <button
                      onClick={() => setMode("upload")}
                      className="text-xs text-primary hover:text-red-300 font-semibold"
                    >
                      Upload a file →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {filteredMedia.map((media: any) => {
                      const isSelected = selectedMedia?._id === media._id;
                      return (
                        <div
                          key={media._id}
                          onClick={() => setSelectedMedia(media)}
                          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all aspect-square ${
                            isSelected
                              ? "border-primary shadow-lg shadow-red-500/20"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {media.fileType?.startsWith("video") ? (
                            <div className="w-full h-full relative">
                              <video
                                src={getImageUrl(media.filePath || media.url) + "#t=0.5"}
                                preload="metadata"
                                className="w-full h-full object-cover bg-zinc-800"
                              />
                              <div className="absolute top-1 right-1 bg-black/60 rounded p-0.5">
                                <Video className="h-3 w-3 text-foreground" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={getImageUrl(media.filePath || media.url)}
                              alt={media.name}
                              className="w-full h-full object-cover bg-zinc-800"
                              loading="lazy"
                            />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary rounded-full p-1 shadow-lg">
                                <Check className="h-4 w-4 text-foreground" />
                              </div>
                            </div>
                          )}
                          {/* Filename banner */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/65 px-1.5 py-0.5">
                            <p className="text-[9px] text-foreground truncate font-medium text-center">{media.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected file info */}
              {selectedMedia && !selectedMedia.isLocal && (
                <div className="shrink-0 p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                    {selectedMedia.fileType?.startsWith("video") ? (
                      <video src={getImageUrl(selectedMedia.filePath || selectedMedia.url) + "#t=0.5"} preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <img src={getImageUrl(selectedMedia.filePath || selectedMedia.url)} alt={selectedMedia.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selectedMedia.name}</p>
                    <p className="text-xs text-foreground/65">{selectedMedia.size || selectedMedia.fileType}</p>
                  </div>
                  <button onClick={() => setSelectedMedia(null)} className="text-foreground/65 hover:text-primary transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upload mode */}
          {mode === "upload" && (
            <div className="flex flex-col gap-4 flex-1">
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => !preview && fileInputRef.current?.click()}
              >
                {preview ? (
                  <div className="space-y-4">
                    {selectedMedia?.file?.type?.startsWith("video") ? (
                      <video src={preview} className="max-h-52 mx-auto rounded-xl" controls />
                    ) : (
                      <img src={preview} alt="Preview" className="max-h-52 mx-auto rounded-xl object-contain" />
                    )}
                    <p className="text-sm text-foreground/70 font-medium">{selectedMedia?.name}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setPreview(null); setSelectedMedia(null); }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-7 w-7 text-foreground/65" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Click to choose a file</p>
                    <p className="text-xs text-foreground/65">or drag and drop here</p>
                    <p className="text-xs text-muted-foreground/80 mt-3">
                      {accept.includes("image") && accept.includes("video") ? "Images & Videos" : accept.includes("image") ? "Images only" : "Videos only"}
                    </p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept={accept} onChange={handleFileSelect} className="hidden" />
              <p className="text-xs text-muted-foreground/80">
                File will be saved to the <strong className="text-foreground/70">{source}</strong> folder in Media Library.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={handleClose} className="border-border">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedMedia || uploading}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "upload" ? (uploading ? "Uploading..." : "Upload & Select") : "Select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
