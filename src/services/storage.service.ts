import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getStorage } from "firebase/storage";
import { initFirebase, app } from "@/lib/firebase";
import { USE_MOCK } from "@/lib/config";

export function buildStoragePath(base: string, file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return `${base}/${Date.now()}-${safeName}.${ext}`;
}

export async function uploadImage(path: string, file: File): Promise<string> {
  if (USE_MOCK) {
    return URL.createObjectURL(file);
  }
  initFirebase();
  if (!app) throw new Error("Firebase not initialized. Sign in with Firebase (not dev bypass) to upload.");
  const storage = getStorage(app);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteImage(path: string): Promise<void> {
  if (USE_MOCK) return;
  initFirebase();
  if (!app) return;
  const storage = getStorage(app);
  await deleteObject(ref(storage, path));
}
