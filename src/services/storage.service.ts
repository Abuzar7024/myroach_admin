import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getStorage,
} from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import {
  initFirebase,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseStorage,
  getFirestoreDb,
  ensureAppCheckReady,
} from "@/lib/firebase";
import { USE_MOCK, USE_FIRESTORE_IMAGES } from "@/lib/config";
import { compressImageForFirestore } from "@/lib/image-compress";
import type { UploadProgress, UploadReadiness } from "@/services/storage.types";

export type { UploadProgress, UploadReadiness };

const UPLOAD_TIMEOUT_MS = 90_000;
const UPLOAD_STALL_MS = 25_000;

export function buildStoragePath(base: string, file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return `${base}/${Date.now()}-${safeName}.${ext}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function emit(onProgress: ((p: UploadProgress) => void) | undefined, progress: UploadProgress) {
  onProgress?.(progress);
}

async function waitForFirebaseUser(timeoutMs = 8000): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not initialized");

  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub();
      reject(new Error("NOT_AUTHENTICATED"));
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timer);
        unsub();
        resolve(user);
      }
    });
  });
}

function mapUploadError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const message = error instanceof Error ? error.message : String(error);

  if (message === "NOT_AUTHENTICATED") {
    return "Firebase session expired — sign out and sign in again on the login page.";
  }
  if (message === "NOT_ADMIN") {
    return "Your account is not an admin in Firestore. Deploy firestore.rules, then set users/{uid}.role to \"admin\".";
  }
  if (message.includes("timed out") || message.includes("Upload timed out") || message === "UPLOAD_STALLED") {
    return "Storage upload failed — you are on free Firestore image mode (no Blaze plan needed).";
  }
  if (
    code === "storage/unauthorized" ||
    code === "storage/unauthenticated" ||
    message.includes("permission") ||
    message.includes("Permission")
  ) {
    return "Storage needs Blaze plan — keep NEXT_PUBLIC_USE_FIREBASE_STORAGE unset (free Firestore images).";
  }
  return message || "Upload failed";
}

async function prepareImageUpload(onProgress?: (p: UploadProgress) => void): Promise<FirebaseUser> {
  emit(onProgress, { phase: "preflight", percent: 5, label: "Connecting to Firebase…" });
  initFirebase();

  if (!USE_FIRESTORE_IMAGES) {
    await ensureAppCheckReady(12_000);
  }

  emit(onProgress, { phase: "preflight", percent: 10, label: "Verifying sign-in…" });
  const user = await waitForFirebaseUser();
  await withTimeout(
    user.getIdToken(true),
    10_000,
    "Firebase Auth token timed out — sign out and sign in again."
  );

  emit(onProgress, { phase: "preflight", percent: 15, label: "Checking admin role…" });
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");

  const profile = await withTimeout(
    getDoc(doc(db, "users", user.uid)),
    10_000,
    "Could not verify admin profile — deploy firestore.rules and check network."
  );

  if (!profile.exists() || profile.data().role !== "admin") {
    throw new Error("NOT_ADMIN");
  }

  return user;
}

async function uploadImageToFirestore(
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<string> {
  await prepareImageUpload(onProgress);

  emit(onProgress, { phase: "uploading", percent: 40, label: "Compressing image…" });
  const dataUrl = await compressImageForFirestore(file);

  emit(onProgress, { phase: "uploading", percent: 85, label: "Image ready" });
  emit(onProgress, { phase: "finalizing", percent: 100, label: "Saved (free Firestore mode)" });

  return dataUrl;
}

export async function getUploadReadiness(): Promise<UploadReadiness> {
  if (USE_MOCK) return { allowed: true };
  try {
    await prepareImageUpload();
    return { allowed: true };
  } catch (error) {
    return { allowed: false, reason: mapUploadError(error) };
  }
}

export async function canUploadToStorage(): Promise<boolean> {
  const { allowed } = await getUploadReadiness();
  return allowed;
}

function uploadWithProgress(
  storageRef: ReturnType<typeof ref>,
  file: File,
  userUid: string,
  onProgress?: (p: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "image/jpeg",
      customMetadata: { uploadedBy: userUid },
    });

    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let lastBytes = -1;

    const clearStallTimer = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };

    const armStallTimer = () => {
      clearStallTimer();
      stallTimer = setTimeout(() => {
        task.cancel();
        reject(new Error("UPLOAD_STALLED"));
      }, UPLOAD_STALL_MS);
    };

    const overallTimer = setTimeout(() => {
      clearStallTimer();
      task.cancel();
      reject(new Error("Upload timed out"));
    }, UPLOAD_TIMEOUT_MS);

    emit(onProgress, { phase: "uploading", percent: 16, label: "Sending to Firebase Storage…" });
    armStallTimer();

    task.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.bytesTransferred > lastBytes) {
          lastBytes = snapshot.bytesTransferred;
          armStallTimer();
        }
        const raw =
          snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
        const percent = 16 + Math.round(raw * 0.74);
        emit(onProgress, {
          phase: "uploading",
          percent,
          label: raw > 0 ? "Sending to Firebase Storage…" : "Starting Storage upload…",
        });
      },
      (error) => {
        clearTimeout(overallTimer);
        clearStallTimer();
        reject(error);
      },
      () => {
        clearTimeout(overallTimer);
        clearStallTimer();
        resolve();
      }
    );
  });
}

async function uploadImageToFirebaseStorage(
  path: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<string> {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing in .env.local");
  }

  const user = await prepareImageUpload(onProgress);
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) throw new Error("Firebase not initialized");

  const storage = getFirebaseStorage() ?? getStorage(firebaseApp, `gs://${bucket}`);
  const storageRef = ref(storage, path);

  await uploadWithProgress(storageRef, file, user.uid, onProgress);

  emit(onProgress, { phase: "finalizing", percent: 92, label: "Saving image URL…" });
  const url = await withTimeout(
    getDownloadURL(storageRef),
    15_000,
    "Uploaded but could not get download URL — try again."
  );
  emit(onProgress, { phase: "finalizing", percent: 100, label: "Saved to Firebase Storage" });
  return url;
}

export async function uploadImage(
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  if (USE_MOCK) {
    emit(onProgress, { phase: "uploading", percent: 50, label: "Uploading…" });
    await new Promise((r) => setTimeout(r, 400));
    emit(onProgress, { phase: "finalizing", percent: 100, label: "Done" });
    return URL.createObjectURL(file);
  }

  if (USE_FIRESTORE_IMAGES) {
    return uploadImageToFirestore(file, onProgress);
  }

  try {
    return await uploadImageToFirebaseStorage(path, file, onProgress);
  } catch (error) {
    throw new Error(mapUploadError(error));
  }
}

export async function deleteImage(path: string): Promise<void> {
  if (USE_MOCK || USE_FIRESTORE_IMAGES) return;
  initFirebase();
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return;
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const storage = getFirebaseStorage() ?? getStorage(firebaseApp, bucket ? `gs://${bucket}` : undefined);
  await deleteObject(ref(storage, path));
}
