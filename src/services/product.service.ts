import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db, initFirebase } from "@/lib/firebase";
import { mockStore } from "@/lib/mock-data";
import {
  toDate,
  toNumber,
  toString,
  toBool,
  toArray,
  pickImages,
} from "@/lib/firestore-helpers";
import { safeList, safeGet } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Product } from "@/types";

const COL = "products";

function fromFirestore(id: string, data: Record<string, unknown>): Product {
  const title = toString(data.title ?? data.name, "Untitled Product");
  const slug = toString(data.slug, title.toLowerCase().replace(/\s+/g, "-"));
  return {
    id,
    title,
    slug,
    description: toString(data.description ?? data.body),
    shortDescription: toString(data.shortDescription ?? data.summary ?? title),
    price: toNumber(data.price ?? data.originalPrice),
    salePrice: data.salePrice != null ? toNumber(data.salePrice) : undefined,
    stock: toNumber(data.stock ?? data.quantity ?? data.inventory),
    sku: toString(data.sku ?? data.SKU ?? id),
    categoryId: toString(data.categoryId ?? data.category),
    tags: toArray<string>(data.tags),
    images: pickImages(data),
    variants: toArray<Product["variants"][0]>(data.variants),
    featured: toBool(data.featured ?? data.isFeatured),
    active: toBool(data.active ?? data.isActive, true),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}

async function fetchProducts(): Promise<Product[]> {
  initFirebase();
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => fromFirestore(d.id, d.data()))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getProducts(): Promise<Product[]> {
  if (USE_MOCK) return [...mockStore.products];
  return safeList(fetchProducts, "products");
}

export async function getProduct(id: string): Promise<Product | null> {
  if (USE_MOCK) return mockStore.products.find((p) => p.id === id) ?? null;
  return safeGet(async () => {
    initFirebase();
    if (!db) return null;
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  }, "product");
}

export async function createProduct(data: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<string> {
  if (USE_MOCK) {
    const id = `prod-${Date.now()}`;
    mockStore.products.push({ ...data, id, createdAt: new Date(), updatedAt: new Date() });
    return id;
  }
  initFirebase();
  if (!db) throw new Error("Firestore not initialized");
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  if (USE_MOCK) {
    const idx = mockStore.products.findIndex((p) => p.id === id);
    if (idx >= 0) mockStore.products[idx] = { ...mockStore.products[idx], ...data, updatedAt: new Date() };
    return;
  }
  initFirebase();
  if (!db) throw new Error("Firestore not initialized");
  const payload: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
  delete payload.id;
  delete payload.createdAt;
  await updateDoc(doc(db, COL, id), payload);
}

export async function deleteProduct(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore.products = mockStore.products.filter((p) => p.id !== id);
    return;
  }
  initFirebase();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COL, id));
}

export async function getLowStockProducts(threshold = 10): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.stock <= threshold && p.active);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.featured && p.active);
}
