const DEFAULT_STORE_URL = "https://myroach.vercel.app";

/** Retired preview deployments — always open the live storefront. */
const LEGACY_STORE_ORIGINS = new Set([
  "https://myroach-34ws.vercel.app",
  "http://myroach-34ws.vercel.app",
]);

function normalizeStoreUrl(raw?: string): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_STORE_URL;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (LEGACY_STORE_ORIGINS.has(url.origin)) return DEFAULT_STORE_URL;
    return url.origin;
  } catch {
    return DEFAULT_STORE_URL;
  }
}

export const STORE_URL = normalizeStoreUrl(process.env.NEXT_PUBLIC_STORE_URL);

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";

export const USE_MOCK =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

/** Firebase Storage needs Blaze plan on many projects. Default: save images in Firestore (free). */
export const USE_FIREBASE_STORAGE = process.env.NEXT_PUBLIC_USE_FIREBASE_STORAGE === "true";

export const USE_FIRESTORE_IMAGES =
  !USE_MOCK &&
  !USE_FIREBASE_STORAGE &&
  process.env.NEXT_PUBLIC_USE_FIRESTORE_IMAGES !== "false";

export const FIREBASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);
