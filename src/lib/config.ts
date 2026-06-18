export const STORE_URL =
  process.env.NEXT_PUBLIC_STORE_URL ?? "https://myroach-34ws.vercel.app";

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
