import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "destructive" | "secondary" }) {
  const variants = {
    default: "bg-zinc-100 text-zinc-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    destructive: "bg-red-100 text-red-800",
    secondary: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}

export function statusBadge(status: string) {
  const map: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    pending: "warning",
    confirmed: "secondary",
    processing: "secondary",
    shipped: "default",
    delivered: "success",
    cancelled: "destructive",
    refunded: "destructive",
    paid: "success",
    failed: "destructive",
  };
  return map[status] ?? "default";
}
