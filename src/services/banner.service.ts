import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { mockStore } from "@/lib/mock-data";
import { toString, toBool, toNumber } from "@/lib/firestore-helpers";
import { safeList } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Banner } from "@/types";

const COL = "banners";

function fromFirestore(id: string, data: Record<string, unknown>): Banner {
  return {
    id,
    title: toString(data.title),
    subtitle: toString(data.subtitle),
    image: toString(data.image ?? data.imageUrl),
    redirectUrl: toString(data.redirectUrl ?? data.url),
    position: toNumber(data.position, 1),
    active: toBool(data.active, true),
  };
}

async function fetchBanners(): Promise<Banner[]> {
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => fromFirestore(d.id, d.data())).sort((a, b) => a.position - b.position);
}

export async function getBanners(): Promise<Banner[]> {
  if (USE_MOCK) return [...mockStore.banners].sort((a, b) => a.position - b.position);
  return safeList(fetchBanners, "banners");
}

export async function createBanner(data: Omit<Banner, "id">): Promise<string> {
  if (USE_MOCK) {
    const id = `ban-${Date.now()}`;
    mockStore.banners.push({ ...data, id });
    return id;
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  const ref = await addDoc(collection(db, COL), data);
  return ref.id;
}

export async function updateBanner(id: string, data: Partial<Banner>): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.banners.findIndex((b) => b.id === id);
    if (idx >= 0) mockStore.banners[idx] = { ...mockStore.banners[idx], ...data };
    return;
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteBanner(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore.banners = mockStore.banners.filter((b) => b.id !== id);
    return;
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COL, id));
}
