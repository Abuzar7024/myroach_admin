"use client";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

export const RAZORPAY_EVENTS_COLLECTION = "razorpay_events";

export interface RazorpayPaymentEvent {
  id: string;
  eventType: string;
  status: "created" | "authorized" | "captured" | "failed" | "refunded";
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  storeOrderId?: string;
  source: "checkout" | "webhook" | "verify";
  message: string;
  createdAt: Date;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate();
  }
  if (typeof value === "string") return new Date(value);
  return new Date();
}

export function subscribeRazorpayEvents(
  onData: (events: RazorpayPaymentEvent[]) => void,
  onError?: (error: Error) => void
) {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(db, RAZORPAY_EVENTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          eventType: String(data.eventType || "unknown"),
          status: (data.status || "created") as RazorpayPaymentEvent["status"],
          amount: Number(data.amount) || 0,
          currency: String(data.currency || "INR"),
          razorpayOrderId: data.razorpayOrderId as string | undefined,
          razorpayPaymentId: data.razorpayPaymentId as string | undefined,
          paymentMethod: data.paymentMethod as string | undefined,
          customerEmail: data.customerEmail as string | undefined,
          customerPhone: data.customerPhone as string | undefined,
          customerName: data.customerName as string | undefined,
          storeOrderId: data.storeOrderId as string | undefined,
          source: (data.source || "checkout") as RazorpayPaymentEvent["source"],
          message: String(data.message || ""),
          createdAt: toDate(data.createdAt),
        };
      });
      onData(events);
    },
    (error) => onError?.(error)
  );
}

export async function fetchRazorpayStatus() {
  const res = await fetch("/api/razorpay/status");
  if (!res.ok) throw new Error("Could not load Razorpay status");
  return res.json() as Promise<{
    configured: boolean;
    mode: "live" | "test" | "unknown";
    keyId: string;
  }>;
}

export async function fetchRazorpayPayments() {
  const res = await fetch("/api/razorpay/payments");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Could not load Razorpay payments");
  }
  return res.json() as Promise<{
    items: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      method?: string;
      email?: string;
      contact?: string;
      orderId?: string;
      createdAt?: number;
    }>;
  }>;
}
