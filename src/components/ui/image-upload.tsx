"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { buildStoragePath, uploadImage } from "@/services/storage.service";

interface ImageUploadProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  storageBase: string;
  accept?: string;
  previewClassName?: string;
  disabled?: boolean;
}

export function ImageUpload({
  label = "Image",
  value,
  onChange,
  storageBase,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  previewClassName = "h-32 w-full max-w-xs rounded-lg object-cover",
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const path = buildStoragePath(storageBase, file);
      const url = await uploadImage(path, file);
      onChange(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <div className="relative">
            <Image src={value} alt="" width={200} height={120} className={previewClassName} unoptimized />
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-zinc-900 p-1 text-white hover:bg-zinc-700"
              onClick={() => onChange("")}
              disabled={disabled || uploading}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className={`flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 ${previewClassName}`}>
            <span className="text-xs text-zinc-400">No image</span>
          </div>
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
          </Button>
          <p className="mt-1 text-xs text-zinc-500">JPEG, PNG, WebP. Syncs to Firebase Storage.</p>
        </div>
      </div>
    </div>
  );
}

interface MultiImageUploadProps {
  label?: string;
  values: string[];
  onChange: (urls: string[]) => void;
  storageBase: string;
  maxImages?: number;
  disabled?: boolean;
}

export function MultiImageUpload({
  label = "Product images",
  values,
  onChange,
  storageBase,
  maxImages = 6,
  disabled,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    const remaining = maxImages - values.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images`);
      return;
    }
    setUploading(true);
    try {
      const uploads: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const path = buildStoragePath(storageBase, file);
        uploads.push(await uploadImage(path, file));
      }
      onChange([...values, ...uploads]);
      toast.success(uploads.length === 1 ? "Image uploaded" : `${uploads.length} images uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-3">
        {values.map((url, i) => (
          <div key={`${url}-${i}`} className="relative">
            <Image src={url} alt="" width={96} height={96} className="h-24 w-24 rounded-lg object-cover" unoptimized />
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-zinc-900 p-1 text-white hover:bg-zinc-700"
              onClick={() => removeAt(i)}
              disabled={disabled || uploading}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {values.length < maxImages && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            {uploading ? "Uploading..." : "Add images"}
          </Button>
        </div>
      )}
    </div>
  );
}
