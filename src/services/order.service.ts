import { collection, doc, getDocs, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db, initFirebase } from "@/lib/firebase";
import { mockStore } from "@/lib/mock-data";
import { toDate, toNumber, toString, toArray } from "@/lib/firestore-helpers";
import { safeList, safeGet } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

const COL = "orders";

function fromFirestore(id: string, data: Record<string, unknown>): Order {
  const shipping = (data.shippingAddress ?? data.shipping ?? data.address ?? {}) as Record<string, unknown>;
  return {
    id,
    userId: toString(data.userId ?? data.customerId),
    customerName: toString(data.customerName ?? shipping.name ?? data.name),
    customerEmail: toString(data.customerEmail ?? shipping.email ?? data.email),
    items: toArray<Order["items"][0]>(data.items ?? data.lineItems ?? data.products),
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
      country: toString(shipping.country, "IN"),
    },
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}

async function fetchOrders(): Promise<Order[]> {
  initFirebase();
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

export async function getOrder(id: string): Promise<Order | null> {
  if (USE_MOCK) return mockStore.orders.find((o) => o.id === id) ?? null;
  return safeGet(async () => {
    initFirebase();
    if (!db) return null;
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  }, "order");
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.orders.findIndex((o) => o.id === id);
    if (idx >= 0) mockStore.orders[idx] = { ...mockStore.orders[idx], status, updatedAt: new Date() };
    return;
  }
  initFirebase();
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, COL, id), { status, updatedAt: Timestamp.now() });
}
