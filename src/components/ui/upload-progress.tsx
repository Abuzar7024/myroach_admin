"use client";

import { Loader2 } from "lucide-react";
import type { UploadProgress } from "@/services/storage.types";

interface UploadProgressBarProps {
  progress: UploadProgress | null;
  uploading: boolean;
}

export function UploadProgressBar({ progress, uploading }: UploadProgressBarProps) {
  if (!uploading && !progress) return null;

  const percent = progress?.percent ?? 0;
  const label = progress?.label ?? "Preparing upload…";

  return (
    <div className="mt-2 min-w-[200px] max-w-xs space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-500" />
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0 font-medium tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all duration-200 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
