import { cn } from "@/lib/utils";
import { Input, Label } from "@/components/ui/input";

interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
}

export function PriceInput({ label, hint, className, ...props }: PriceInputProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">
          ₹
        </span>
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          placeholder="0 or 999.50"
          className={cn("pl-8", className)}
          {...props}
        />
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
