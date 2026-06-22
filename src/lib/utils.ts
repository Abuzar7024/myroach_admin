import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY, STORE_URL } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function hasDecimalPart(value: number): boolean {
  return Math.abs(Math.round(value * 100) % 100) > 0;
}

export function formatCurrency(amount: number) {
  if (!Number.isFinite(amount)) {
    return CURRENCY === "INR" ? "₹0" : "0";
  }

  const value = roundMoney(amount);
  const fractionDigits = hasDecimalPart(value) ? 2 : 0;

  if (CURRENCY === "INR") {
    const numberPart = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(value);
    return `₹${numberPart}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export { USE_MOCK, STORE_URL, CURRENCY, FIREBASE_CONFIGURED } from "./config";

export function storeProductUrl(slug: string) {
  return `${STORE_URL}/products/${slug}`;
}

export function storeCategoryUrl(slug: string) {
  return `${STORE_URL}/collections/${slug}`;
}

export { storePage, storeProductPath, storeCollectionPath, STOREFRONT_PATHS } from "./storefront-links";

/** Hostname shown next to admin “open store” links (e.g. myroach.vercel.app). */
export function storeUrlHost() {
  try {
    return new URL(STORE_URL).host;
  } catch {
    return STORE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}
