"use client";

import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { STORE_URL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";

export function TopBar() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((s, i) => ({
    label: s.replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <header className="sticky top-0 z-20 -mx-6 mb-6 border-b border-zinc-200 bg-zinc-100/80 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-100/60">
      <div className="flex items-center justify-between gap-4">
        <nav className="hidden items-center gap-1 text-sm text-zinc-500 sm:flex">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && <span className="text-zinc-300">/</span>}
              <span className={i === crumbs.length - 1 ? "font-medium text-zinc-900 capitalize" : "capitalize"}>
                {c.label}
              </span>
            </span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink size={14} />
              Open Store
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
