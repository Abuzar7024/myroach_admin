export type AdminNotificationType =
  | "order"
  | "order_request"
  | "subscriber"
  | "review"
  | "customer"
  | "catalog"
  | "storefront";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  href?: string;
  createdAt: number;
  read: boolean;
}

export type AdminNotificationInput = Omit<AdminNotification, "read" | "createdAt"> & {
  createdAt?: number;
  /** When true, only adds to the bell — no extra toast. */
  silent?: boolean;
};

type Listener = (input: AdminNotificationInput) => void;

const listeners = new Set<Listener>();

export function subscribeAdminNotifications(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAdminNotification(input: AdminNotificationInput) {
  listeners.forEach((l) => l(input));
  return input;
}
