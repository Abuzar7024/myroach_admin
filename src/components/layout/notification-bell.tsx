"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, ShoppingCart, Mail, Star, Globe, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminNotifications } from "@/providers/admin-notifications-provider";
import { cn } from "@/lib/utils";

function iconFor(type: string) {
  switch (type) {
    case "order":
      return ShoppingCart;
    case "customer":
      return Users;
    case "subscriber":
      return Mail;
    case "review":
      return Star;
    case "catalog":
    case "storefront":
      return Globe;
    default:
      return Package;
  }
}

function timeAgo(ts: number) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Updates</p>
              <p className="text-xs text-zinc-500">New site activity & live changes</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={markAllRead}>
                <CheckCheck size={14} />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-[min(60vh,400px)] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No updates yet. New orders, signups, and live saves will show here.
              </p>
            ) : (
              notifications.map((n) => {
                const Icon = iconFor(n.type);
                const content = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-zinc-50",
                      !n.read && "bg-sky-50/60"
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{n.message}</p>
                      <p className="mt-1 text-[10px] text-zinc-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
                  </div>
                );

                if (n.href) {
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      target={n.href.startsWith("http") ? "_blank" : undefined}
                      rel={n.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                      className="block border-b border-zinc-100 last:border-0"
                    >
                      {content}
                      {n.href.startsWith("http") && (
                        <ExternalLink size={12} className="absolute right-4 top-4 text-zinc-400" />
                      )}
                    </Link>
                  );
                }

                return (
                  <button
                    key={n.id}
                    type="button"
                    className="block w-full border-b border-zinc-100 text-left last:border-0"
                    onClick={() => markRead(n.id)}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
