"use client";

import { cn } from "@/lib/utils";
import { PRODUCT_SIZES } from "@/lib/catalog";

interface SizePickerProps {
  value: string[];
  onChange: (sizes: string[]) => void;
  className?: string;
}

export function SizePicker({ value, onChange, className }: SizePickerProps) {
  function toggle(size: string) {
    if (value.includes(size)) {
      onChange(value.filter((s) => s !== size));
    } else {
      onChange([...value, size].sort(
        (a, b) => PRODUCT_SIZES.indexOf(a as (typeof PRODUCT_SIZES)[number]) - PRODUCT_SIZES.indexOf(b as (typeof PRODUCT_SIZES)[number])
      ));
    }
  }

  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-zinc-700">Available sizes *</p>
      <div className="flex flex-wrap gap-2">
        {PRODUCT_SIZES.map((size) => {
          const selected = value.includes(size);
          return (
            <button
              key={size}
              type="button"
              onClick={() => toggle(size)}
              className={cn(
                "min-w-[3rem] rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
              )}
            >
              {size}
            </button>
          );
        })}
      </div>
      {value.length === 0 && (
        <p className="mt-2 text-xs text-amber-600">Select at least one size shoppers can order.</p>
      )}
    </div>
  );
}
