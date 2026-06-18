"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  emitAdminNotification,
  subscribeAdminNotifications,
  type AdminNotification,
} from "@/lib/admin-notifications";
import { getRealtimeDb, subscribeCollection } from "@/lib/realtime";
import { USE_MOCK, STORE_URL } from "@/lib/config";
import { toString, toNumber, toBool } from "@/lib/firestore-helpers";

const STORAGE_KEY = "myroach-admin-notifications-read";
const MAX_NOTIFICATIONS = 40;

interface AdminNotificationsContextValue {
  notifications: AdminNotification[];
  unreadCount: number;
  unreadByHref: Record<string, number>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  unreadByHref: {},
  markRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
});

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function toastForNotification(n: AdminNotification) {
  const action = n.href
    ? {
        label: "Check",
        onClick: () => {
          window.location.href = n.href!;
        },
      }
    : undefined;

  if (n.type === "order") {
    toast.success(n.title, { description: n.message, duration: 8000, action });
  } else if (n.type === "order_request") {
    toast.message(n.title, { description: n.message, duration: 9000, action });
  } else if (n.type === "catalog" || n.type === "storefront") {
    toast.message(n.title, { description: n.message, duration: 7000, action });
  } else {
    toast.message(n.title, { description: n.message, duration: 7000, action });
  }
}

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  const pushNotification = useCallback((input: Omit<AdminNotification, "read"> & { silent?: boolean }) => {
    const item: AdminNotification = {
      id: input.id,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
      createdAt: input.createdAt,
      read: readIds.has(input.id),
    };

    setNotifications((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      return [item, ...prev].slice(0, MAX_NOTIFICATIONS);
    });

    if (!item.read && !input.silent) {
      toastForNotification(item);
    }
  }, [readIds]);

  useEffect(() => {
    return subscribeAdminNotifications((input) => {
      pushNotification({
        id: input.id,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href,
        createdAt: input.createdAt ?? Date.now(),
        silent: input.silent,
      });
    });
  }, [pushNotification]);

  useEffect(() => {
    if (USE_MOCK) return;
    const db = getRealtimeDb();
    if (!db) return;

    const known = {
      orders: new Set<string>(),
      orderRequests: new Set<string>(),
      subscribers: new Set<string>(),
      reviews: new Set<string>(),
    };
    const ready = { orders: false, orderRequests: false, subscribers: false, reviews: false };

    const unsubs = [
      subscribeCollection(db, "orders", (changes) => {
        if (!ready.orders) {
          changes.forEach((c) => known.orders.add(c.id));
          ready.orders = true;
          return;
        }
        changes
          .filter((c) => c.type === "added" && !known.orders.has(c.id))
          .forEach((c) => {
            known.orders.add(c.id);
            const total = toNumber(c.data.total);
            const name = toString(c.data.customerName ?? c.data.name, "Customer");
            pushNotification({
              id: `order-${c.id}`,
              type: "order",
              title: "New order on the site",
              message: `${name} placed an order — check details and fulfill it.`,
              href: `/dashboard/orders/${c.id}`,
              createdAt: Date.now(),
            });
          });
      }),

      subscribeCollection(db, "orderRequests", (changes) => {
        if (!ready.orderRequests) {
          changes.forEach((c) => known.orderRequests.add(c.id));
          ready.orderRequests = true;
          return;
        }
        changes
          .filter((c) => c.type === "added" && !known.orderRequests.has(c.id))
          .forEach((c) => {
            known.orderRequests.add(c.id);
            const type = toString(c.data.type, "cancel");
            const name = toString(c.data.customerName, "Customer");
            const orderId = toString(c.data.orderId);
            pushNotification({
              id: `oreq-${c.id}`,
              type: "order_request",
              title: type === "refund" ? "New refund request" : "New cancellation request",
              message: `${name} submitted a ${type} request — review and reply.`,
              href: `/dashboard/orders/${orderId}`,
              createdAt: Date.now(),
            });
          });
      }),

      subscribeCollection(db, "subscribers", (changes) => {
        if (!ready.subscribers) {
          changes.forEach((c) => known.subscribers.add(c.id));
          ready.subscribers = true;
          return;
        }
        changes
          .filter((c) => c.type === "added" && !known.subscribers.has(c.id))
          .forEach((c) => {
            known.subscribers.add(c.id);
            const email = toString(c.data.email);
            pushNotification({
              id: `sub-${c.id}`,
              type: "subscriber",
              title: "New newsletter signup",
              message: email ? `${email} joined the rotation.` : "Someone subscribed on the storefront.",
              href: "/dashboard/subscribers",
              createdAt: Date.now(),
            });
          });
      }),

      subscribeCollection(db, "reviews", (changes) => {
        if (!ready.reviews) {
          changes.forEach((c) => known.reviews.add(c.id));
          ready.reviews = true;
          return;
        }
        changes
          .filter((c) => c.type === "added" && !known.reviews.has(c.id))
          .forEach((c) => {
            known.reviews.add(c.id);
            const approved = toBool(c.data.approved ?? c.data.published, false);
            if (approved) return;
            const author = toString(c.data.author ?? c.data.userName, "Someone");
            pushNotification({
              id: `rev-${c.id}`,
              type: "review",
              title: "New review to moderate",
              message: `${author} left a review — approve or hide it.`,
              href: "/dashboard/reviews",
              createdAt: Date.now(),
            });
          });
      }),
    ];

    // Newsletter collection fallback (storefront may use either name)
    const unsubNewsletter = subscribeCollection(db, "newsletter", (changes) => {
      changes
        .filter((c) => c.type === "added" && !known.subscribers.has(`nl-${c.id}`))
        .forEach((c) => {
          if (!ready.subscribers) {
            known.subscribers.add(`nl-${c.id}`);
            return;
          }
          known.subscribers.add(`nl-${c.id}`);
          const email = toString(c.data.email);
          pushNotification({
            id: `sub-nl-${c.id}`,
            type: "subscriber",
            title: "New newsletter signup",
            message: email ? `${email} joined from the storefront.` : "New subscriber on the site.",
            href: "/dashboard/subscribers",
            createdAt: Date.now(),
          });
        });
      ready.subscribers = true;
    });

    return () => {
      unsubs.forEach((u) => u());
      unsubNewsletter();
    };
  }, [pushNotification]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const nextRead = new Set(readIds);
      prev.forEach((n) => nextRead.add(n.id));
      saveReadIds(nextRead);
      setReadIds(nextRead);
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, [readIds]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const enriched = useMemo(
    () => notifications.map((n) => ({ ...n, read: n.read || readIds.has(n.id) })),
    [notifications, readIds]
  );

  const unreadCount = enriched.filter((n) => !n.read).length;

  const unreadByHref = useMemo(() => {
    const map: Record<string, number> = {};
    const navKey = (href: string) => {
      if (href.startsWith("/dashboard/orders")) return "/dashboard/orders";
      if (href.startsWith("/dashboard/customers")) return "/dashboard/customers";
      if (href.startsWith("/dashboard/products")) return "/dashboard/products";
      return href;
    };
    enriched.forEach((n) => {
      if (!n.read && n.href) {
        const key = navKey(n.href);
        map[key] = (map[key] ?? 0) + 1;
      }
    });
    return map;
  }, [enriched]);

  return (
    <AdminNotificationsContext.Provider
      value={{
        notifications: enriched,
        unreadCount,
        unreadByHref,
        markRead,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications() {
  return useContext(AdminNotificationsContext);
}

/** Call after admin saves — adds to notification bell + optional storefront link. */
export function notifyStorefrontLive(message: string, href = STORE_URL) {
  emitAdminNotification({
    id: `live-${Date.now()}`,
    type: "storefront",
    title: "Updated on live site",
    message,
    href,
  });
}
