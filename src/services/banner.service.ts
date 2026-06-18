import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { runFirestoreWrite } from "@/lib/firestore-write";
import { assertBannerPayload, assertPersistedImageUrl } from "@/lib/validate-payload";
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
  assertBannerPayload(data);

  if (USE_MOCK) {
    const id = `ban-${Date.now()}`;
    mockStore.banners.push({ ...data, id });
    return id;
  }

  return runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    const ref = await addDoc(collection(db, COL), { ...data, slot: "hero" });
    return ref.id;
  });
}

export async function updateBanner(id: string, data: Partial<Banner>): Promise<void> {
  if (data.title != null && !data.title.trim()) throw new Error("Banner title is required");
  if (data.image) assertPersistedImageUrl(data.image, "Banner image");

  if (USE_MOCK) {
    const idx = mockStore.banners.findIndex((b) => b.id === id);
    if (idx >= 0) mockStore.banners[idx] = { ...mockStore.banners[idx], ...data };
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await updateDoc(doc(db, COL, id), { ...data, slot: "hero" });
  });
}

export async function deleteBanner(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore.banners = mockStore.banners.filter((b) => b.id !== id);
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await deleteDoc(doc(db, COL, id));
  });
}
