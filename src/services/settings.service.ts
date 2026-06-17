import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { mockStore } from "@/lib/mock-data";
import { safeData } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Settings, HomepageContent } from "@/types";

const SETTINGS_DOC = "settings";
const SETTINGS_ID = "general";
const HOMEPAGE_ID = "homepage";

async function fetchSettings(): Promise<Settings> {
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return { ...mockStore.settings };
  const snap = await getDoc(doc(db, SETTINGS_DOC, SETTINGS_ID));
  return snap.exists() ? (snap.data() as Settings) : { ...mockStore.settings };
}

async function fetchHomepage(): Promise<HomepageContent> {
  initFirebase();
  const db = getFirestoreDb();
  if (!db) return { ...mockStore.homepage };
  const snap = await getDoc(doc(db, SETTINGS_DOC, HOMEPAGE_ID));
  return snap.exists() ? (snap.data() as HomepageContent) : { ...mockStore.homepage };
}

export async function getSettings(): Promise<Settings> {
  if (USE_MOCK) return { ...mockStore.settings };
  return safeData(fetchSettings, { ...mockStore.settings }, "settings");
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
  if (USE_MOCK) {
    mockStore.settings = { ...mockStore.settings, ...data };
    return;
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await setDoc(doc(db, SETTINGS_DOC, SETTINGS_ID), data, { merge: true });
}

export async function getHomepageContent(): Promise<HomepageContent> {
  if (USE_MOCK) return { ...mockStore.homepage };
  return safeData(fetchHomepage, { ...mockStore.homepage }, "homepage");
}

export async function updateHomepageContent(data: Partial<HomepageContent>): Promise<void> {
  if (USE_MOCK) {
    mockStore.homepage = { ...mockStore.homepage, ...data };
    return;
  }
  initFirebase();
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await setDoc(doc(db, SETTINGS_DOC, HOMEPAGE_ID), data, { merge: true });
}
