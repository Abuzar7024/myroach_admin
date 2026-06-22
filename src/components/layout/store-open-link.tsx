import { ExternalLink } from "lucide-react";
import { STORE_URL, storeUrlHost } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StoreOpenLinkVariant = "button" | "sidebar" | "text";

interface StoreOpenLinkProps {
  variant?: StoreOpenLinkVariant;
  className?: string;
  label?: string;
}

export function StoreOpenLink({
  variant = "button",
  className,
  label = "Open Store",
}: StoreOpenLinkProps) {
  const host = storeUrlHost();

  if (variant === "sidebar") {
    return (
      <a
        href={STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mx-3 mt-3 flex flex-col gap-0.5 rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-800",
          className
        )}
      >
        <span className="flex items-center gap-2">
          View Live Store
          <ExternalLink size={14} className="ml-auto opacity-60" />
        </span>
        <span className="truncate text-[11px] font-normal text-zinc-400">{STORE_URL}</span>
      </a>
    );
  }

  if (variant === "text") {
    return (
      <a
        href={STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("flex flex-col items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white", className)}
      >
        <span className="flex items-center gap-2">
          <ExternalLink size={14} />
          {label}
        </span>
        <span className="text-xs text-zinc-500">{host}</span>
      </a>
    );
  }

  return (
    <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className={className}>
      <Button variant="outline" size="sm" className="h-auto gap-2 py-2">
        <ExternalLink size={14} />
        <span className="flex flex-col items-start gap-0.5 text-left leading-tight">
          <span>{label}</span>
          <span className="text-[10px] font-normal text-zinc-500">{host}</span>
        </span>
      </Button>
    </a>
  );
}
