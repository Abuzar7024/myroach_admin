"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ImageCropModalProps {
  open: boolean;
  file: File | null;
  aspectRatio?: number;
  onClose: () => void;
  onConfirm: (croppedFile: File) => void;
}

export function ImageCropModal({
  open,
  file,
  aspectRatio = 1,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, size, size);

    const cropW = size;
    const cropH = size / aspectRatio;
    const cropY = (size - cropH) / 2;

    const scale = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight) * zoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = (cropW - drawW) / 2 + offset.x;
    const y = cropY + (cropH - drawH) / 2 + offset.y;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, cropY, cropW, cropH);
    ctx.clip();
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    ctx.strokeStyle = "rgba(0,240,255,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, cropY + 0.5, cropW - 1, cropH - 1);
  }, [aspectRatio, offset, zoom]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview, imageUrl]);

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }

  function onPointerUp() {
    setDragging(false);
  }

  async function handleConfirm() {
    const img = imageRef.current;
    if (!img || !file) return;
    setProcessing(true);
    try {
      const outputSize = 1024;
      const outCanvas = document.createElement("canvas");
      outCanvas.width = outputSize;
      outCanvas.height = Math.round(outputSize / aspectRatio);
      const ctx = outCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      const cropW = 320;
      const cropH = 320 / aspectRatio;
      const cropY = (320 - cropH) / 2;
      const scale = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight) * zoom;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = (cropW - drawW) / 2 + offset.x;
      const y = cropY + (cropH - drawH) / 2 + offset.y;

      const sx = ((0 - x) / drawW) * img.naturalWidth;
      const sy = ((cropY - y) / drawH) * img.naturalHeight;
      const sw = (cropW / drawW) * img.naturalWidth;
      const sh = (cropH / drawH) * img.naturalHeight;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        outCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Crop failed"))),
          "image/jpeg",
          0.92
        );
      });

      const base = file.name.replace(/\.[^.]+$/, "");
      const cropped = new File([blob], `${base}-cropped.jpg`, { type: "image/jpeg" });
      onConfirm(cropped);
      onClose();
    } finally {
      setProcessing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">Crop image (1:1)</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Drag to reposition, zoom to fit. Square crop syncs cleanly to the storefront.
        </p>

        <div className="mt-4 space-y-3">
          {imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imageRef} src={imageUrl} alt="" className="hidden" onLoad={drawPreview} />
              <canvas
                ref={canvasRef}
                className="mx-auto w-full max-w-[320px] cursor-grab rounded-lg border border-zinc-300 active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
              <label className="flex items-center gap-3 text-sm text-zinc-500">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </label>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing || !file}>
            {processing ? "Processing..." : "Use crop"}
          </Button>
        </div>
      </div>
    </div>
  );
}
