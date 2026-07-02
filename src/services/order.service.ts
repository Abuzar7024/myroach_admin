import { collection, doc, getDocs, getDoc, updateDoc, deleteDoc, Timestamp, onSnapshot, arrayUnion } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { runFirestoreWrite } from "@/lib/firestore-write";
import { mockStore } from "@/lib/mock-data";
import { toDate, toNumber, toString, toArray } from "@/lib/firestore-helpers";
import { safeList, safeGet } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Order, OrderStatus, PaymentStatus, OrderStatusUpdate } from "@/types";

const COL = "orders";

function mapOrderItems(raw: unknown): Order["items"] {
  const items = toArray<Record<string, unknown>>(raw);
  return items.map((item) => ({
    productId: toString(item.productId),
    title: toString(item.title ?? item.name, "Item"),
    quantity: toNumber(item.quantity, 1),
    price: toNumber(item.price),
    image: item.image != null ? toString(item.image) : undefined,
    printSide:
      item.printSide === "front" || item.printSide === "back" ? item.printSide : undefined,
  }));
}

function mapStatusHistory(raw: unknown): OrderStatusUpdate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        status: toString(row.status, "pending") as OrderStatus,
        at: toDate(row.at),
        by: (toString(row.by, "admin") as OrderStatusUpdate["by"]),
        note: row.note != null ? toString(row.note) : undefined,
        trackingNumber: row.trackingNumber != null ? toString(row.trackingNumber) : undefined,
      };
    })
    .filter((entry) => entry.status);
}

function buildStatusEvent(
  status: OrderStatus,
  note?: string,
  trackingNumber?: string
): Record<string, unknown> {
  const event: Record<string, unknown> = {
    status,
    at: Timestamp.now(),
    by: "admin",
  };
  if (note) event.note = note;
  if (trackingNumber) event.trackingNumber = trackingNumber;
  return event;
}

function fromFirestore(id: string, data: Record<string, unknown>): Order {
  const shipping = (data.shippingAddress ?? data.shipping ?? data.address ?? {}) as Record<string, unknown>;
  return {
    id,
    orderNumber: data.orderNumber != null ? toString(data.orderNumber) : undefined,
    userId: toString(data.userId ?? data.customerId),
    customerName: toString(data.customerName ?? shipping.name ?? data.name),
    customerEmail: toString(data.customerEmail ?? shipping.email ?? data.email),
    customerPhone: toString(data.customerPhone ?? shipping.phone),
    items: mapOrderItems(data.items ?? data.lineItems ?? data.products),
    subtotal: toNumber(data.subtotal),
    tax: toNumber(data.tax),
    shippingCharge: toNumber(data.shippingCharge ?? data.shipping ?? data.shippingCost),
    discount: toNumber(data.discount),
    total: toNumber(data.total ?? data.amount),
    status: toString(data.status, "pending") as OrderStatus,
    paymentStatus: toString(data.paymentStatus, "pending") as PaymentStatus,
    shippingAddress: {
      name: toString(shipping.name),
      email: toString(shipping.email),
      phone: toString(shipping.phone),
      address: toString(shipping.address ?? shipping.line1),
      city: toString(shipping.city),
      state: toString(shipping.state),
      zip: toString(shipping.zip ?? shipping.postalCode),
      country: toString(shipping.country, "India"),
    },
    trackingNumber: data.trackingNumber != null ? toString(data.trackingNumber) : undefined,
    statusHistory: mapStatusHistory(data.statusHistory),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}

async function fetchOrders(): Promise<Order[]> {
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => fromFirestore(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getOrders(): Promise<Order[]> {
  if (USE_MOCK) return [...mockStore.orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return safeList(fetchOrders, "orders");
}

/** Live order list for admin dashboard — updates when storefront places orders. */
export function subscribeOrders(
  onData: (orders: Order[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (USE_MOCK) {
    onData([...mockStore.orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    return () => {};
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) {
    onError?.(new Error("Firestore not initialized"));
    return () => {};
  }
  return onSnapshot(
    collection(db, COL),
    (snap) => {
      const orders = snap.docs
        .map((d) => fromFirestore(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(orders);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function getOrder(id: string): Promise<Order | null> {
  if (USE_MOCK) return mockStore.orders.find((o) => o.id === id) ?? null;
  return safeGet(async () => {
    initFirebase();
    const db = getFirestoreDb();
    if (!db) return null;
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  }, "order");
}

/** Live updates for a single order (status changes from admin or storefront). */
export function subscribeOrder(
  id: string,
  onData: (order: Order | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (USE_MOCK) {
    onData(mockStore.orders.find((o) => o.id === id) ?? null);
    return () => {};
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) {
    onError?.(new Error("Firestore not initialized"));
    return () => {};
  }
  return onSnapshot(
    doc(db, COL, id),
    (snap) => onData(snap.exists() ? fromFirestore(snap.id, snap.data()) : null),
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.orders.findIndex((o) => o.id === id);
    if (idx >= 0) mockStore.orders[idx] = { ...mockStore.orders[idx], status, updatedAt: new Date() };
    return;
  }
  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await updateDoc(doc(db, COL, id), {
      status,
      updatedAt: Timestamp.now(),
      statusHistory: arrayUnion(buildStatusEvent(status, `Status updated to ${status}.`)),
    });
  });
}

export async function updateOrderPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.orders.findIndex((o) => o.id === id);
    if (idx >= 0) mockStore.orders[idx] = { ...mockStore.orders[idx], paymentStatus, updatedAt: new Date() };
    return;
  }
  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await updateDoc(doc(db, COL, id), {
      paymentStatus,
      updatedAt: Timestamp.now(),
    });
  });
}

export async function deleteOrder(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore.orders = mockStore.orders.filter((o) => o.id !== id);
    return;
  }
  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await deleteDoc(doc(db, COL, id));
  });
}

export async function updateOrderTracking(id: string, trackingNumber: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.orders.findIndex((o) => o.id === id);
    if (idx >= 0) {
      mockStore.orders[idx] = {
        ...mockStore.orders[idx],
        trackingNumber,
        status: mockStore.orders[idx].status === "delivered" ? "delivered" : "shipped",
        updatedAt: new Date(),
      };
    }
    return;
  }
  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await updateDoc(doc(db, COL, id), {
      trackingNumber,
      status: "shipped",
      updatedAt: Timestamp.now(),
      statusHistory: arrayUnion(
        buildStatusEvent("shipped", `Tracking ID: ${trackingNumber}`, trackingNumber)
      ),
    });
  });
}
