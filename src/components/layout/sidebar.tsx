"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Image,
  Ticket,
  Settings,
  Warehouse,
  LogOut,
  Menu,
  X,
  BarChart3,
  Home,
  Star,
  Mail,
  FileText,
  Activity,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { cn, USE_MOCK } from "@/lib/utils";
import { StoreOpenLink } from "@/components/layout/store-open-link";
import { useAuth } from "@/providers/auth-provider";
import { useSync } from "@/providers/sync-provider";
import { useAdminNotifications } from "@/providers/admin-notifications-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/dashboard/products", label: "Products", icon: Package },
      { href: "/dashboard/categories", label: "Categories", icon: FolderTree },
      { href: "/dashboard/inventory", label: "Inventory", icon: Warehouse },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
      { href: "/dashboard/payments", label: "Razorpay", icon: CreditCard },
      { href: "/dashboard/order-requests", label: "Order Requests", icon: RotateCcw },
      { href: "/dashboard/customers", label: "Customers", icon: Users },
      { href: "/dashboard/coupons", label: "Coupons", icon: Ticket },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/dashboard/banners", label: "Banners", icon: Image },
      { href: "/dashboard/homepage", label: "Homepage", icon: Home },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star },
      { href: "/dashboard/subscribers", label: "Subscribers", icon: Mail },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

const SIDEBAR_SCROLL_KEY = "myroach-admin-sidebar-scroll";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { connected, counts } = useSync();
  const { unreadByHref, unreadCount, markReadForPath } = useAdminNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  function saveSidebarScroll() {
    const el = navRef.current;
    if (!el) return;
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(el.scrollTop));
    } catch {
      /* ignore */
    }
  }

  function restoreSidebarScroll() {
    const el = navRef.current;
    if (!el) return;
    try {
      const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
      if (saved != null) el.scrollTop = Number(saved);
    } catch {
      /* ignore */
    }
  }

  useLayoutEffect(() => {
    restoreSidebarScroll();
  }, [pathname]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onScroll = () => saveSidebarScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    markReadForPath(pathname);
  }, [pathname, markReadForPath]);

  function navBadge(href: string) {
    const count = unreadByHref[href] ?? 0;
    if (!count) return null;
    return (
      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
        {count > 9 ? "9+" : count}
      </span>
    );
  }

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-md border bg-white p-2 shadow-sm lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-zinc-200 bg-white shadow-sm transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
          <div>
            <span className="text-lg font-bold tracking-tight text-zinc-900">MY ROACH</span>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Admin Panel</p>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white" title="Unread updates">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <Badge variant={USE_MOCK ? "warning" : connected ? "success" : "destructive"} className="text-[10px]">
              {USE_MOCK ? "Mock" : connected ? "Live" : "Offline"}
            </Badge>
          </div>
        </div>

        <StoreOpenLink variant="sidebar" />

        {!USE_MOCK && connected && (
          <div className="mx-3 mt-2 flex flex-wrap gap-1 px-1">
            <span className="text-[10px] text-zinc-400">{counts.products}p · {counts.orders}o · {counts.customers}c</span>
          </div>
        )}

        <nav ref={navRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      scroll={false}
                      onClick={() => {
                        saveSidebarScroll();
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      )}
                    >
                      <item.icon size={17} />
                      {item.label}
                      {navBadge(item.href)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-4">
          <p className="mb-1 text-xs font-medium text-zinc-900">{user?.name}</p>
          <p className="mb-3 text-xs text-zinc-500 truncate">{user?.email}</p>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={logout}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}

export function DashboardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
