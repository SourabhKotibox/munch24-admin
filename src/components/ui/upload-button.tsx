import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  value?: string;
  accept?: string;
  onChange: (url: string) => void;
  label?: string;
};

export default function UploadButton({ value, accept = "image/*", onChange, label = "Upload" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleSelect = () => inputRef.current?.click();

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const json = await res.json();
        if (json?.url) {
          onChange(json.url);
          setPreview(json.url);
          setUploading(false);
          return;
        }
      }
    } catch (err) {
      // ignore and fallback
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      onChange(dataUrl);
      setPreview(dataUrl);
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />

      <Button variant="ghost" size="sm" onClick={handleSelect}>
        {uploading ? "Uploading..." : label}
      </Button>

      <div className="w-24 h-14 bg-muted rounded overflow-hidden border border-border flex items-center justify-center">
        {preview ? (
          (preview.startsWith("data:") || /\.(jpg|jpeg|png|gif|webp)$/i.test(preview)) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <video src={preview} className="w-full h-full object-cover" muted />
          )
        ) : (
          <span className="text-xs text-muted-foreground">No file</span>
        )}
      </div>
    </div>
  );
}
