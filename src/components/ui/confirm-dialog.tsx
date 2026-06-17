"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  triggerLabel = "Delete",
  variant = "destructive",
}: {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  triggerLabel?: string;
  variant?: "destructive" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
