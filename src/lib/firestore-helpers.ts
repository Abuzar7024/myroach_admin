import { Timestamp } from "firebase/firestore";

export function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return fallback;
}

export function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

export function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

export function pickImages(data: Record<string, unknown>): string[] {
  const images = toArray<string>(data.images);
  if (images.length) return images;
  const image = toString(data.image);
  if (image) return [image];
  const imageUrl = toString(data.imageUrl);
  if (imageUrl) return [imageUrl];
  return [];
}

/** Firestore rejects undefined field values — omit them before addDoc/setDoc/updateDoc. */
export function sanitizeFirestoreData<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
}
