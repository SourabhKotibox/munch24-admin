import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleSelect = () => inputRef.current?.click();

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const fallbackToReader = (f: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        onChange(String(reader.result || ""));
        setPreview(String(reader.result || ""));
        setUploading(false);
        setProgress(0);
      };
      reader.onerror = () => {
        setUploading(false);
        setProgress(0);
      };
      reader.readAsDataURL(f);
    };

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (json?.url) {
              onChange(json.url);
              setPreview(json.url);
            }
          } catch {
            fallbackToReader(file);
          }
        } else {
          fallbackToReader(file);
        }
        setUploading(false);
        setProgress(0);
      };

      xhr.onerror = () => {
        fallbackToReader(file);
      };

      xhr.send(formData);
    } catch {
      fallbackToReader(file);
    }
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
        {uploading ? `${progress}% Uploading...` : label}
      </Button>

      {uploading && <Progress value={progress} className="w-24 h-2" />}

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
