import { initFirebase, getFirebaseAuth, getFirestoreDb, ensureFirestoreOnline } from "@/lib/firebase";
import { USE_MOCK } from "@/lib/config";

const DEV_BYPASS_UID = "dev-bypass-admin";

export function mapFirestoreWriteError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const message = error instanceof Error ? error.message : String(error);

  if (code === "permission-denied" || message.includes("permission")) {
    return "Save failed — deploy Firestore rules, then set users/{your-uid}.role to \"admin\" in Firebase Console.";
  }
  if (code === "unavailable" || message.includes("offline")) {
    return "Save failed — Firestore is offline. Check network and App Check settings.";
  }
  if (message.includes("Firestore not initialized")) {
    return "Save failed — Firebase is not configured. Check .env.local and restart the server.";
  }
  return message || "Save failed — nothing was written to the database.";
}

/** Ensures Firebase is ready for a write. Throws if not — caller must not save. */
export async function prepareFirestoreWrite(): Promise<void> {
  if (USE_MOCK) return;

  initFirebase();
  await ensureFirestoreOnline();

  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    throw new Error("Save failed — sign in with Firebase admin email/password (dev bypass cannot write).");
  }
  if (auth.currentUser.uid === DEV_BYPASS_UID) {
    throw new Error("Save failed — dev bypass cannot write to Firestore. Use real admin login.");
  }

  const db = getFirestoreDb();
  if (!db) {
    throw new Error("Save failed — Firestore not initialized.");
  }
}

export async function runFirestoreWrite<T>(operation: () => Promise<T>): Promise<T> {
  await prepareFirestoreWrite();
  try {
    return await operation();
  } catch (error) {
    throw new Error(mapFirestoreWriteError(error));
  }
}
