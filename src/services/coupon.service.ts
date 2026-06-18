import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { runFirestoreWrite } from "@/lib/firestore-write";
import { assertCouponPayload } from "@/lib/validate-payload";
import { mockStore } from "@/lib/mock-data";
import { toDate, toNumber, toString, toBool } from "@/lib/firestore-helpers";
import { safeList } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Coupon } from "@/types";

const COL = "coupons";

function fromFirestore(id: string, data: Record<string, unknown>): Coupon {
  return {
    id,
    code: toString(data.code),
    discountType: (toString(data.discountType, "percentage") as Coupon["discountType"]),
    discountValue: toNumber(data.discountValue),
    minimumOrderAmount: toNumber(data.minimumOrderAmount),
    expiryDate: toDate(data.expiryDate),
    usageLimit: toNumber(data.usageLimit, 100),
    active: toBool(data.active, true),
  };
}

async function fetchCoupons(): Promise<Coupon[]> {
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => fromFirestore(d.id, d.data()));
}

export async function getCoupons(): Promise<Coupon[]> {
  if (USE_MOCK) return [...mockStore.coupons];
  return safeList(fetchCoupons, "coupons");
}

export async function createCoupon(data: Omit<Coupon, "id">): Promise<string> {
  assertCouponPayload(data);

  if (USE_MOCK) {
    const id = `coup-${Date.now()}`;
    mockStore.coupons.push({ ...data, id });
    return id;
  }

  return runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    const ref = await addDoc(collection(db, COL), {
      ...data,
      expiryDate: Timestamp.fromDate(data.expiryDate),
    });
    return ref.id;
  });
}

export async function updateCoupon(id: string, data: Partial<Coupon>): Promise<void> {
  if (data.code != null && !data.code.trim()) throw new Error("Coupon code is required");
  if (data.discountValue != null && data.discountValue <= 0) {
    throw new Error("Discount value must be greater than zero");
  }

  if (USE_MOCK) {
    const idx = mockStore.coupons.findIndex((c) => c.id === id);
    if (idx >= 0) mockStore.coupons[idx] = { ...mockStore.coupons[idx], ...data };
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    const payload: Record<string, unknown> = { ...data };
    if (data.expiryDate) payload.expiryDate = Timestamp.fromDate(data.expiryDate);
    await updateDoc(doc(db, COL, id), payload);
  });
}

export async function deleteCoupon(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore.coupons = mockStore.coupons.filter((c) => c.id !== id);
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await deleteDoc(doc(db, COL, id));
  });
}
