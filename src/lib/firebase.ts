import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
  type AppCheck,
} from "firebase/app-check";
import { USE_MOCK } from "./config";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let appCheck: AppCheck | undefined;
let appCheckReady: Promise<void> | undefined;
let initialized = false;

function initAppCheck(firebaseApp: FirebaseApp) {
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
  const recaptchaKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_KEY;
  const forceAppCheck = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED === "true";

  // Skip App Check in local dev unless explicitly enabled — unregistered debug tokens cause "client offline"
  if (process.env.NODE_ENV === "development" && !forceAppCheck) return;

  if (debugToken && typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    // @ts-expect-error Firebase debug token
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  if (!recaptchaKey && !debugToken) return;

  try {
    const providerKey =
      recaptchaKey ??
      (process.env.NODE_ENV === "development" ? "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe" : "");
    if (!providerKey) return;
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(providerKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckReady = getToken(appCheck, false)
      .then(() => undefined)
      .catch((err: unknown) => {
        console.warn("App Check token fetch failed:", err);
      });
  } catch {
    console.warn("App Check initialization skipped");
  }
}

/** Wait for App Check before Firestore reads/writes when enforcement is enabled. */
export async function waitForFirestoreReady(): Promise<void> {
  initFirebase();
  if (appCheckReady) await appCheckReady;
}

export function initFirebase() {
  if (USE_MOCK) return;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("Firebase config missing — check .env.local");
    return;
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    if (typeof window !== "undefined") initAppCheck(app);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }

  initialized = true;
}

export function getFirebaseAuth(): Auth | undefined {
  initFirebase();
  return auth;
}

export function getFirestoreDb(): Firestore | undefined {
  initFirebase();
  return db;
}

if (typeof window !== "undefined" && !USE_MOCK) {
  initFirebase();
}

export { app, auth, db, storage };
