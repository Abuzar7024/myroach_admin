import { STORE_URL } from "@/lib/config";

export const STOREFRONT_PATHS = {
  home: "/",
  shop: "/shop",
  privacy: "/privacy",
  terms: "/terms",
  shippingReturns: "/shipping-returns",
  contact: "/contact",
  about: "/about",
} as const;

export function storePage(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return STORE_URL.replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = STORE_URL.replace(/\/$/, "");
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${normalized}`;
}

export function storeProductPath(slug: string) {
  return `/product/${slug}`;
}

export function storeCollectionPath(slug: string) {
  return `/collections/${slug}`;
}
