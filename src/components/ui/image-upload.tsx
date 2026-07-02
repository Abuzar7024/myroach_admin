"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { UploadProgressBar } from "@/components/ui/upload-progress";
import {
  buildStoragePath,
  uploadImage,
  getUploadReadiness,
} from "@/services/storage.service";
import type { UploadProgress } from "@/services/storage.types";
import { USE_FIRESTORE_IMAGES } from "@/lib/config";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { useAuth } from "@/providers/auth-provider";

interface ImageUploadProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  storageBase: string;
  accept?: string;
  previewClassName?: string;
  disabled?: boolean;
  crop?: boolean;
  aspectRatio?: number;
}

export function ImageUpload({
  label = "Image",
  value,
  onChange,
  storageBase,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  previewClassName = "h-32 w-32 rounded-lg object-cover",
  disabled,
  crop = true,
  aspectRatio = 1,
}: ImageUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploadBlockedReason, setUploadBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    void getUploadReadiness().then(({ allowed, reason }) => {
      setUploadBlockedReason(allowed ? null : reason ?? "Upload not available");
    });
  }, [user?.uid]);

  async function uploadFile(file: File) {
    const readiness = await getUploadReadiness();
    if (!readiness.allowed) {
      setUploadBlockedReason(readiness.reason ?? "Upload not available");
      toast.error(readiness.reason ?? "Cannot upload — check Firebase admin login and rules.");
      return;
    }
    setUploadBlockedReason(null);
    setUploading(true);
    setUploadProgress({ phase: "preflight", percent: 0, label: "Starting…" });
    try {
      const path = buildStoragePath(storageBase, file);
      const url = await uploadImage(path, file, setUploadProgress);
      onChange(url);
      toast.success(
        USE_FIRESTORE_IMAGES ? "Image saved (free Firestore mode)" : "Image uploaded to Firebase Storage"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadBlockedReason(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileSelect(file: File) {
    if (crop) {
      setCropFile(file);
      setCropOpen(true);
      return;
    }
    void uploadFile(file);
  }

  const uploadDisabled = disabled || uploading;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {uploadBlockedReason && !uploading && (
        <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{uploadBlockedReason}</span>
        </p>
      )}
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <div className="relative">
            <Image src={value} alt="" width={200} height={200} className={previewClassName} unoptimized />
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
          <div
            className={`flex aspect-square w-32 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 ${previewClassName}`}
          >
            <span className="text-xs text-zinc-400">1:1 preview</span>
          </div>
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploadDisabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <div className="flex flex-wrap items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploadDisabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={14} />
              {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            </Button>
            <UploadProgressBar progress={uploadProgress} uploading={uploading} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {USE_FIRESTORE_IMAGES
              ? "Free mode: compressed image saved in Firestore when you create/save the product"
              : `${crop ? "1:1 crop · " : ""}File → Firebase Storage · URL saved to Firestore when you create/save the product`}
          </p>
        </div>
      </div>

      <ImageCropModal
        open={cropOpen}
        file={cropFile}
        aspectRatio={aspectRatio}
        onClose={() => {
          setCropOpen(false);
          setCropFile(null);
          if (inputRef.current) inputRef.current.value = "";
        }}
        onConfirm={(file) => void uploadFile(file)}
      />
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
  maxImages = USE_FIRESTORE_IMAGES ? 4 : 6,
  disabled,
}: MultiImageUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadBlockedReason, setUploadBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    void getUploadReadiness().then(({ allowed, reason }) => {
      setUploadBlockedReason(allowed ? null : reason ?? "Upload not available");
    });
  }, [user?.uid]);

  async function processQueue(files: File[]) {
    const readiness = await getUploadReadiness();
    if (!readiness.allowed) {
      setUploadBlockedReason(readiness.reason ?? "Upload not available");
      toast.error(readiness.reason ?? "Cannot upload — check Firebase admin login and rules.");
      return;
    }
    setUploadBlockedReason(null);

    const remaining = maxImages - values.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images`);
      return;
    }

    const queue = files.slice(0, remaining);
    setUploading(true);
    try {
      const uploads: string[] = [];
      for (let i = 0; i < queue.length; i++) {
        const file = queue[i];
        const path = buildStoragePath(storageBase, file);
        const url = await uploadImage(path, file, (p) => {
          setUploadProgress({
            ...p,
            label:
              queue.length > 1
                ? `Image ${i + 1}/${queue.length} — ${p.label}`
                : p.label,
          });
        });
        uploads.push(url);
      }
      onChange([...values, ...uploads]);
      toast.success(
        uploads.length === 1
          ? USE_FIRESTORE_IMAGES
            ? "Image saved (free Firestore mode)"
            : "Image uploaded"
          : `${uploads.length} images saved`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadBlockedReason(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFiles(files: FileList) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setPendingFiles(list);
    setCropFile(list[0]);
    setCropOpen(true);
  }

  async function onCropConfirm(cropped: File) {
    const rest = pendingFiles.slice(1);
    const toUpload = [cropped, ...rest];
    setCropOpen(false);
    setCropFile(null);
    setPendingFiles([]);
    await processQueue(toUpload);
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  const uploadDisabled = disabled || uploading;

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>{label}</Label>
      {uploadBlockedReason && !uploading && (
        <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{uploadBlockedReason}</span>
        </p>
      )}
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
            disabled={uploadDisabled}
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
            }}
          />
          <div className="flex flex-wrap items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploadDisabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={14} />
              {uploading ? "Uploading…" : "Add images (1:1 crop)"}
            </Button>
            <UploadProgressBar progress={uploadProgress} uploading={uploading} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {USE_FIRESTORE_IMAGES
              ? `Free mode: compressed images saved in Firestore (max ${maxImages} per product)`
              : "File → Firebase Storage · URL saved to Firestore when you create/save the product"}
          </p>
        </div>
      )}

      <ImageCropModal
        open={cropOpen}
        file={cropFile}
        aspectRatio={1}
        onClose={() => {
          setCropOpen(false);
          setCropFile(null);
          setPendingFiles([]);
          if (inputRef.current) inputRef.current.value = "";
        }}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}

interface FrontBackImageUploadProps {
  label?: string;
  /** Positional: [0] = front, [1] = back. Empty strings mark an unfilled slot. */
  values: string[];
  onChange: (urls: string[]) => void;
  storageBase: string;
  disabled?: boolean;
}

/**
 * Two clearly-labeled cards — Front and Back — each accepting a single image.
 * Front maps to images[0] (the storefront's primary image), Back to images[1].
 */
export function FrontBackImageUpload({
  label = "Product images",
  values,
  onChange,
  storageBase,
  disabled,
}: FrontBackImageUploadProps) {
  const setSlot = (index: 0 | 1, url: string) => {
    const next: string[] = [values[0] ?? "", values[1] ?? ""];
    next[index] = url;
    onChange(next);
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>{label}</Label>
      <p className="text-xs text-zinc-500">
        Add a front and a back photo (max 2). The front image is shown first on the storefront.
      </p>
      <div className="flex flex-wrap gap-6">
        <div className="rounded-lg border border-zinc-200 p-3">
          <ImageUpload
            label="Front"
            value={values[0] ?? ""}
            onChange={(url) => setSlot(0, url)}
            storageBase={`${storageBase}/front`}
            disabled={disabled}
          />
        </div>
        <div className="rounded-lg border border-zinc-200 p-3">
          <ImageUpload
            label="Back"
            value={values[1] ?? ""}
            onChange={(url) => setSlot(1, url)}
            storageBase={`${storageBase}/back`}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
