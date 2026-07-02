"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { onAuthStateChanged } from "firebase/auth";
import {
  emitAdminNotification,
  subscribeAdminNotifications,
  type AdminNotification,
} from "@/lib/admin-notifications";
import { getFirebaseAuth, initFirebase } from "@/lib/firebase";
import { getRealtimeDb, subscribeCollection } from "@/lib/realtime";
import { USE_MOCK, STORE_URL } from "@/lib/config";
import { toString, toBool } from "@/lib/firestore-helpers";
import { normalizeRequestType } from "@/lib/order-request";

const STORAGE_KEY = "myroach-admin-notifications-dismissed";
const LEGACY_STORAGE_KEY = "myroach-admin-notifications-read";
// IDs that have already triggered a toast — persisted so a notification
// toasts at most once, ever (no repeat toasts on reload/re-subscribe).
const SEEN_STORAGE_KEY = "myroach-admin-notifications-seen";
const MAX_SEEN = 500;
const DEV_BYPASS_UID = "dev-bypass-admin";
const MAX_NOTIFICATIONS = 40;

function navKeyFromHref(href: string) {
  if (href.startsWith("/dashboard/order-requests")) return "/dashboard/order-requests";
  if (href.startsWith("/dashboard/orders")) return "/dashboard/orders";
  if (href.startsWith("/dashboard/customers")) return "/dashboard/customers";
  if (href.startsWith("/dashboard/products")) return "/dashboard/products";
  if (href.startsWith("/dashboard/reviews")) return "/dashboard/reviews";
  if (href.startsWith("/dashboard/subscribers")) return "/dashboard/subscribers";
  return href;
}

interface AdminNotificationsContextValue {
  notifications: AdminNotification[];
  unreadCount: number;
  unreadByHref: Record<string, number>;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  markAllRead: () => void;
  markReadForPath: (pathname: string) => void;
  clearAll: () => void;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  unreadByHref: {},
  markRead: () => {},
  dismiss: () => {},
  markAllRead: () => {},
  markReadForPath: () => {},
  clearAll: () => {},
});

function loadDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const ids = new Set<string>();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      (JSON.parse(stored) as string[]).forEach((id) => ids.add(id));
    }
    const legacy = sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      (JSON.parse(legacy) as string[]).forEach((id) => ids.add(id));
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    if (legacy && ids.size) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    }
    return ids;
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(SEEN_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    // Keep only the most recent IDs so this can't grow without bound.
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...ids].slice(-MAX_SEEN)));
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
  } else if (n.type === "customer") {
    toast.message(n.title, { description: n.message, duration: 7000, action });
  } else if (n.type === "catalog" || n.type === "storefront") {
    toast.message(n.title, { description: n.message, duration: 7000, action });
  } else {
    toast.message(n.title, { description: n.message, duration: 7000, action });
  }
}

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedIds());
  const dismissedRef = useRef(dismissedIds);
  dismissedRef.current = dismissedIds;

  // Persisted set of notification IDs that have already toasted.
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    seenRef.current = loadSeenIds();
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveDismissedIds(next);
      return next;
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const pushNotification = useCallback((input: Omit<AdminNotification, "read"> & { silent?: boolean }) => {
    if (dismissedRef.current.has(input.id)) return;

    const seen = seenRef.current;
    const alreadyToasted = seen.has(input.id);

    const item: AdminNotification = {
      id: input.id,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
      createdAt: input.createdAt,
      read: false,
    };

    setNotifications((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      return [item, ...prev].slice(0, MAX_NOTIFICATIONS);
    });

    // Toast only the first time we ever see this notification.
    if (!input.silent && !alreadyToasted) {
      toastForNotification(item);
    }
    if (!alreadyToasted) {
      seen.add(input.id);
      saveSeenIds(seen);
    }
  }, []);

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

    initFirebase();
    const auth = getFirebaseAuth();
    if (!auth) return;

    let unsubs: (() => void)[] = [];

    const onPermError = (collectionName: string) => (err: Error) => {
      console.error(`[notifications] ${collectionName}:`, err);
      if (err.message.includes("permission")) {
        toast.error(
          "Live notifications blocked — sign in with Firebase admin (not dev bypass) and deploy Firestore rules.",
          { id: "notif-perm" }
        );
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      unsubs.forEach((u) => u());
      unsubs = [];

      if (!fbUser || fbUser.uid === DEV_BYPASS_UID) return;

      const db = getRealtimeDb();
      if (!db) return;

      const known = {
        orders: new Set<string>(),
        orderRequests: new Set<string>(),
        subscribers: new Set<string>(),
        reviews: new Set<string>(),
        customers: new Set<string>(),
      };
      const ready = {
        orders: false,
        orderRequests: false,
        subscribers: false,
        reviews: false,
        customers: false,
      };

      unsubs = [
        subscribeCollection(
          db,
          "orders",
          (changes, meta) => {
            if (!ready.orders) {
              changes.forEach((c) => known.orders.add(c.id));
              if (!meta.fromCache) ready.orders = true;
              return;
            }
            changes
              .filter((c) => c.type === "added" && !known.orders.has(c.id))
              .forEach((c) => {
                known.orders.add(c.id);
                const name = toString(c.data.customerName ?? c.data.name, "Customer");
                pushNotification({
                  id: `order-${c.id}`,
                  type: "order",
                  title: "New order on the site",
                  message: `${name} placed an order — open Orders to fulfill it.`,
                  href: `/dashboard/orders/${c.id}`,
                  createdAt: Date.now(),
                });
              });
          },
          onPermError("orders")
        ),

        subscribeCollection(
          db,
          "orderRequests",
          (changes, meta) => {
            if (!ready.orderRequests) {
              changes.forEach((c) => known.orderRequests.add(c.id));
              if (!meta.fromCache) ready.orderRequests = true;
              return;
            }
            changes
              .filter((c) => c.type === "added" && !known.orderRequests.has(c.id))
              .forEach((c) => {
                known.orderRequests.add(c.id);
                const type = normalizeRequestType(c.data.type);
                const name = toString(c.data.customerName, "Customer");
                const title =
                  type === "exchange"
                    ? "New exchange request"
                    : "New refund / cancellation request";
                pushNotification({
                  id: `oreq-${c.id}`,
                  type: "order_request",
                  title,
                  message: `${name} submitted a ${type} request — review and approve in Order Requests.`,
                  href: `/dashboard/order-requests`,
                  createdAt: Date.now(),
                });
              });
          },
          onPermError("orderRequests")
        ),

        subscribeCollection(
          db,
          "subscribers",
          (changes, meta) => {
            if (!ready.subscribers) {
              changes.forEach((c) => known.subscribers.add(c.id));
              if (!meta.fromCache) ready.subscribers = true;
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
                  message: email ? `${email} joined from the storefront.` : "Someone subscribed on the site.",
                  href: "/dashboard/subscribers",
                  createdAt: Date.now(),
                });
              });
          },
          onPermError("subscribers")
        ),

        subscribeCollection(
          db,
          "reviews",
          (changes, meta) => {
            if (!ready.reviews) {
              changes.forEach((c) => known.reviews.add(c.id));
              if (!meta.fromCache) ready.reviews = true;
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
          },
          onPermError("reviews")
        ),

        subscribeCollection(
          db,
          "users",
          (changes, meta) => {
            if (!ready.customers) {
              changes.forEach((c) => known.customers.add(c.id));
              if (!meta.fromCache) ready.customers = true;
              return;
            }
            changes
              .filter((c) => c.type === "added" && !known.customers.has(c.id))
              .forEach((c) => {
                const role = toString(c.data.role, "customer");
                if (role === "admin") return;
                known.customers.add(c.id);
                const name = toString(c.data.name ?? c.data.displayName, "New customer");
                pushNotification({
                  id: `cust-${c.id}`,
                  type: "customer",
                  title: "New customer signup",
                  message: `${name} registered on the storefront.`,
                  href: `/dashboard/customers/${c.id}`,
                  createdAt: Date.now(),
                });
              });
          },
          onPermError("users")
        ),
      ];

      const unsubNewsletter = subscribeCollection(
        db,
        "newsletter",
        (changes, meta) => {
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
          if (!meta.fromCache) ready.subscribers = true;
        },
        onPermError("newsletter")
      );
      unsubs.push(unsubNewsletter);
    });

    return () => {
      unsubAuth();
      unsubs.forEach((u) => u());
    };
  }, [pushNotification]);

  const markRead = useCallback((id: string) => {
    dismiss(id);
  }, [dismiss]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const ids = prev.map((n) => n.id);
      if (!ids.length) return prev;
      setDismissedIds((old) => {
        const next = new Set(old);
        ids.forEach((id) => next.add(id));
        saveDismissedIds(next);
        return next;
      });
      return [];
    });
  }, []);

  const markReadForPath = useCallback((pathname: string) => {
    setNotifications((prev) => {
      const ids = prev
        .filter((n) => n.href && pathname.startsWith(navKeyFromHref(n.href)))
        .map((n) => n.id);
      if (!ids.length) return prev;
      setDismissedIds((old) => {
        const next = new Set(old);
        ids.forEach((id) => next.add(id));
        saveDismissedIds(next);
        return next;
      });
      return prev.filter((n) => !ids.includes(n.id));
    });
  }, []);

  const clearAll = useCallback(() => {
    markAllRead();
  }, [markAllRead]);

  const visible = useMemo(
    () => notifications.filter((n) => !dismissedIds.has(n.id)),
    [notifications, dismissedIds]
  );

  const unreadCount = visible.length;

  const unreadByHref = useMemo(() => {
    const map: Record<string, number> = {};
    visible.forEach((n) => {
      if (n.href) {
        const key = navKeyFromHref(n.href);
        map[key] = (map[key] ?? 0) + 1;
      }
    });
    return map;
  }, [visible]);

  return (
    <AdminNotificationsContext.Provider
      value={{
        notifications: visible,
        unreadCount,
        unreadByHref,
        markRead,
        dismiss,
        markAllRead,
        markReadForPath,
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
