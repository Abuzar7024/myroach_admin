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
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { runFirestoreWrite } from "@/lib/firestore-write";
import { assertProductPayload, assertPersistedImageUrls } from "@/lib/validate-payload";
import { mockStore } from "@/lib/mock-data";
import {
  toDate,
  toNumber,
  toString,
  toBool,
  toArray,
  pickImages,
  sanitizeFirestoreData,
} from "@/lib/firestore-helpers";
import { safeList, safeGet } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import {
  DEFAULT_MAX_ORDER_QTY,
  DEFAULT_MIN_ORDER_QTY,
  DEFAULT_RETURN_POLICY,
} from "@/lib/catalog";
import type { Product } from "@/types";

const COL = "products";

function readSizes(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.sizes)) {
    return (data.sizes as unknown[]).filter((s): s is string => typeof s === "string" && s.length > 0);
  }
  const variants = toArray<{ type?: string; value?: string }>(data.variants);
  const fromVariants = variants
    .filter((v) => v.type === "size" && v.value)
    .map((v) => v.value as string);
  return fromVariants;
}

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
    sku: toString(data.sku ?? data.SKU),
    categoryId: toString(data.categoryId ?? data.category),
    categorySlug: toString(data.categorySlug),
    gender: (toString(data.gender) || "unisex") as Product["gender"],
    tags: toArray<string>(data.tags),
    images: pickImages(data),
    sizes: readSizes(data),
    variants: toArray<Product["variants"][0]>(data.variants),
    minOrderQty: toNumber(data.minOrderQty, DEFAULT_MIN_ORDER_QTY) || DEFAULT_MIN_ORDER_QTY,
    maxOrderQty: toNumber(data.maxOrderQty, DEFAULT_MAX_ORDER_QTY) || DEFAULT_MAX_ORDER_QTY,
    returnPolicy: toString(data.returnPolicy, DEFAULT_RETURN_POLICY) || DEFAULT_RETURN_POLICY,
    featured: toBool(data.featured ?? data.isFeatured),
    featuredDisplaySeconds:
      data.featuredDisplaySeconds != null ? toNumber(data.featuredDisplaySeconds) : undefined,
    active: toBool(data.active ?? data.isActive, true),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}

async function fetchProducts(): Promise<Product[]> {
  initFirebase();
  const db = getFirestoreDb();
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
    const db = getFirestoreDb();
    if (!db) return null;
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  }, "product");
}

export async function createProduct(data: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<string> {
  assertProductPayload(data);

  if (USE_MOCK) {
    const id = `prod-${Date.now()}`;
    mockStore.products.push({ ...data, id, createdAt: new Date(), updatedAt: new Date() });
    return id;
  }

  return runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    const ref = await addDoc(
      collection(db, COL),
      sanitizeFirestoreData({
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
    return ref.id;
  });
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  if (data.images) assertPersistedImageUrls(data.images);
  if (data.stock != null && (Number.isNaN(data.stock) || data.stock < 0)) {
    throw new Error("Stock cannot be negative");
  }

  if (USE_MOCK) {
    const idx = mockStore.products.findIndex((p) => p.id === id);
    if (idx >= 0) mockStore.products[idx] = { ...mockStore.products[idx], ...data, updatedAt: new Date() };
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    const payload: Record<string, unknown> = sanitizeFirestoreData({
      ...data,
      updatedAt: Timestamp.now(),
    });
    delete payload.id;
    delete payload.createdAt;
    await updateDoc(doc(db, COL, id), payload);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore.products = mockStore.products.filter((p) => p.id !== id);
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await deleteDoc(doc(db, COL, id));
  });
}

export async function getLowStockProducts(threshold = 10): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.stock <= threshold && p.active);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.featured && p.active);
}
