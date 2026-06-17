export const STORE_URL =
  process.env.NEXT_PUBLIC_STORE_URL ?? "https://myroach-34ws.vercel.app";

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export const FIREBASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);
