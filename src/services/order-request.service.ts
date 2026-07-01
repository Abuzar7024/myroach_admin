import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { runFirestoreWrite } from "@/lib/firestore-write";
import { toDate, toNumber, toString } from "@/lib/firestore-helpers";
import { USE_MOCK } from "@/lib/config";
import {
  normalizeRequestType,
  renderOrderResponseMessage,
  type OrderRequest,
  type OrderRequestAdminResponse,
  type OrderRequestStatus,
  type OrderRequestType,
  type OrderResponseTemplateKey,
} from "@/lib/order-request";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const COL = "orderRequests";

function mapAdminResponse(raw: unknown): OrderRequestAdminResponse | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const data = raw as Record<string, unknown>;
  return {
    templateKey: toString(data.templateKey) as OrderResponseTemplateKey,
    message: toString(data.message),
    refundDays: data.refundDays != null ? toNumber(data.refundDays) : undefined,
    customNote: data.customNote != null ? toString(data.customNote) : undefined,
    sentAt: toDate(data.sentAt).toISOString(),
  };
}

function fromFirestore(id: string, data: Record<string, unknown>): OrderRequest {
  return {
    id,
    orderId: toString(data.orderId),
    orderNumber: toString(data.orderNumber),
    userId: toString(data.userId),
    customerName: toString(data.customerName),
    customerEmail: data.customerEmail != null ? toString(data.customerEmail) : undefined,
    orderTotal: toNumber(data.orderTotal),
    type: normalizeRequestType(data.type),
    status: toString(data.status, "pending") as OrderRequestStatus,
    reason: toString(data.reason),
    exchangeDetails: data.exchangeDetails != null ? toString(data.exchangeDetails) : undefined,
    policyAccepted: data.policyAccepted === true,
    adminResponse: mapAdminResponse(data.adminResponse),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}

export function subscribeOrderRequests(
  onData: (requests: OrderRequest[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (USE_MOCK) {
    onData([]);
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
      const requests = snap.docs
        .map((d) => fromFirestore(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(requests);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export function subscribeOrderRequestsForOrder(
  orderId: string,
  onData: (requests: OrderRequest[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (USE_MOCK) {
    onData([]);
    return () => {};
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) {
    onError?.(new Error("Firestore not initialized"));
    return () => {};
  }
  const q = query(collection(db, COL), where("orderId", "==", orderId));
  return onSnapshot(
    q,
    (snap) => {
      const requests = snap.docs
        .map((d) => fromFirestore(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(requests);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function getPendingRequestCount(): Promise<number> {
  if (USE_MOCK) return 0;
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return 0;
  const snap = await getDocs(query(collection(db, COL), where("status", "==", "pending")));
  return snap.size;
}

function buildStatusEvent(status: OrderStatus, note: string) {
  return {
    status,
    at: Timestamp.now(),
    by: "admin",
    note,
  };
}

export async function respondToOrderRequest(input: {
  requestId: string;
  orderId: string;
  requestType: OrderRequestType;
  decision: OrderRequestStatus;
  templateKey: OrderResponseTemplateKey;
  refundDays?: number;
  customNote?: string;
  orderTotal: number;
}): Promise<void> {
  if (USE_MOCK) return;

  const message = renderOrderResponseMessage(input.templateKey, {
    refundDays: input.refundDays,
    customNote: input.customNote,
    amount: formatCurrency(input.orderTotal),
  });

  // Build the response WITHOUT undefined fields — Firestore rejects `undefined`
  // (e.g. when the admin adds no note, or the template has no refund days),
  // which would throw and stop the order-status update from ever running.
  const note = input.customNote?.trim();
  const adminResponse: Record<string, unknown> = {
    templateKey: input.templateKey,
    message,
    sentAt: Timestamp.now(),
  };
  if (input.refundDays != null) adminResponse.refundDays = input.refundDays;
  if (note) adminResponse.customNote = note;

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await updateDoc(doc(db, COL, input.requestId), {
      status: input.decision,
      adminResponse,
      updatedAt: Timestamp.now(),
    });

    if (input.decision !== "approved") return;

    const orderSnap = await getDoc(doc(db, "orders", input.orderId));
    const orderStatus = orderSnap.exists()
      ? toString(orderSnap.data()?.status, "pending")
      : "pending";

    if (input.requestType === "exchange") {
      await updateDoc(doc(db, "orders", input.orderId), {
        status: "processing",
        updatedAt: Timestamp.now(),
        statusHistory: arrayUnion(
          buildStatusEvent("processing", "Exchange approved — preparing replacement shipment.")
        ),
      });
      return;
    }

    if (["shipped", "delivered"].includes(orderStatus)) {
      await updateDoc(doc(db, "orders", input.orderId), {
        status: "refunded",
        paymentStatus: "refunded",
        updatedAt: Timestamp.now(),
        statusHistory: arrayUnion(buildStatusEvent("refunded", "Refund approved by admin.")),
      });
    } else {
      await updateDoc(doc(db, "orders", input.orderId), {
        status: "cancelled",
        updatedAt: Timestamp.now(),
        statusHistory: arrayUnion(buildStatusEvent("cancelled", "Cancellation approved by admin.")),
      });
    }
  });
}
