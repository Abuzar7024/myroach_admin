import { collection, doc, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { db, initFirebase } from "@/lib/firebase";
import { mockStore } from "@/lib/mock-data";
import { toDate, toString, toBool } from "@/lib/firestore-helpers";
import { safeList, safeGet } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { User } from "@/types";

const COL = "users";

function fromFirestore(id: string, data: Record<string, unknown>): User {
  return {
    uid: id,
    name: toString(data.name ?? data.displayName, "User"),
    email: toString(data.email),
    role: (data.role as User["role"]) ?? "customer",
    active: toBool(data.active, true),
    createdAt: toDate(data.createdAt),
  };
}

async function fetchCustomers(): Promise<User[]> {
  initFirebase();
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => fromFirestore(d.id, d.data()))
    .filter((u) => u.role === "customer");
}

export async function getCustomers(): Promise<User[]> {
  if (USE_MOCK) return mockStore.users.filter((u) => u.role === "customer");
  return safeList(fetchCustomers, "customers");
}

export async function getCustomer(uid: string): Promise<User | null> {
  if (USE_MOCK) return mockStore.users.find((u) => u.uid === uid) ?? null;
  return safeGet(async () => {
    initFirebase();
    if (!db) return null;
    const snap = await getDoc(doc(db, COL, uid));
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  }, "customer");
}

export async function updateCustomer(uid: string, data: Partial<User>): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.users.findIndex((u) => u.uid === uid);
    if (idx >= 0) mockStore.users[idx] = { ...mockStore.users[idx], ...data };
    return;
  }
  initFirebase();
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, COL, uid), data);
}
