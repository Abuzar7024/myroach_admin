import { Input } from "@/components/ui/input";
import { formatNumberField, parseNumberField } from "@/lib/number-input";
import { cn } from "@/lib/utils";

interface OptionalNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function OptionalNumberInput({
  value,
  onChange,
  className,
  ...props
}: OptionalNumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      className={cn(className)}
      value={formatNumberField(value)}
      onChange={(e) => onChange(parseNumberField(e.target.value))}
      {...props}
    />
  );
}
