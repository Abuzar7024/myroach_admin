import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { runFirestoreWrite } from "@/lib/firestore-write";
import { assertCategoryPayload } from "@/lib/validate-payload";
import { mockStore } from "@/lib/mock-data";
import { toString, toBool } from "@/lib/firestore-helpers";
import { safeList, safeGet } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Category } from "@/types";

const COL = "categories";

function fromFirestore(id: string, data: Record<string, unknown>): Category {
  const name = toString(data.name ?? data.title, "Category");
  return {
    id,
    name,
    slug: toString(data.slug, name.toLowerCase().replace(/\s+/g, "-")),
    image: toString(data.image ?? data.imageUrl),
    description: data.description != null ? toString(data.description) : undefined,
    gender: (toString(data.gender) || "unisex") as Category["gender"],
    active: toBool(data.active ?? data.isActive, true),
  };
}

async function fetchCategories(): Promise<Category[]> {
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => fromFirestore(d.id, d.data()));
}

export async function getCategories(): Promise<Category[]> {
  if (USE_MOCK) return [...mockStore.categories];
  return safeList(fetchCategories, "categories");
}

export async function getCategory(id: string): Promise<Category | null> {
  if (USE_MOCK) return mockStore.categories.find((c) => c.id === id) ?? null;
  return safeGet(async () => {
    initFirebase();
    const db = getFirestoreDb();
    if (!db) return null;
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  }, "category");
}

export async function createCategory(data: Omit<Category, "id">): Promise<string> {
  assertCategoryPayload(data);

  if (USE_MOCK) {
    const id = `cat-${Date.now()}`;
    mockStore.categories.push({ ...data, id });
    return id;
  }

  return runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    const ref = await addDoc(collection(db, COL), data);
    return ref.id;
  });
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<void> {
  if (data.name != null || data.slug != null) {
    assertCategoryPayload({
      name: data.name ?? "x",
      slug: data.slug ?? "x",
      gender: data.gender,
    });
  }

  if (USE_MOCK) {
    const idx = mockStore.categories.findIndex((c) => c.id === id);
    if (idx >= 0) mockStore.categories[idx] = { ...mockStore.categories[idx], ...data };
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await updateDoc(doc(db, COL, id), data);
  });
}

export async function deleteCategory(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore.categories = mockStore.categories.filter((c) => c.id !== id);
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await deleteDoc(doc(db, COL, id));
  });
}
