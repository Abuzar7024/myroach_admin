import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { toDate, toNumber, toString, toBool } from "@/lib/firestore-helpers";
import { safeList } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Review } from "@/types";

const COL = "reviews";

const mockReviews: Review[] = [
  { id: "rev-1", productId: "prod-1", author: "Rahul K.", rating: 5, comment: "Insane quality bhai!", approved: true, createdAt: new Date() },
  { id: "rev-2", productId: "prod-2", author: "Priya S.", rating: 4, comment: "Love the fit", approved: false, createdAt: new Date() },
];

let mockStore = [...mockReviews];

function fromFirestore(id: string, data: Record<string, unknown>): Review {
  return {
    id,
    productId: toString(data.productId ?? data.product),
    author: toString(data.author ?? data.name ?? data.userName),
    rating: toNumber(data.rating, 5),
    comment: toString(data.comment ?? data.text ?? data.review),
    approved: toBool(data.approved ?? data.published, false),
    createdAt: toDate(data.createdAt),
  };
}

async function fetchReviews(): Promise<Review[]> {
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => fromFirestore(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getReviews(): Promise<Review[]> {
  if (USE_MOCK) return [...mockStore];
  return safeList(fetchReviews, "reviews");
}

export async function approveReview(id: string, approved: boolean): Promise<void> {
  if (USE_MOCK) {
    mockStore = mockStore.map((r) => r.id === id ? { ...r, approved } : r);
    return;
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, COL, id), { approved });
}

export async function deleteReview(id: string): Promise<void> {
  if (USE_MOCK) {
    mockStore = mockStore.filter((r) => r.id !== id);
    return;
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COL, id));
}
