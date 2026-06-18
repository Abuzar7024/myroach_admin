import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";
import { runFirestoreWrite } from "@/lib/firestore-write";
import { assertPersistedImageUrl } from "@/lib/validate-payload";
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
  const defaults: HomepageContent = { ...mockStore.homepage };
  if (!db) return defaults;
  const snap = await getDoc(doc(db, SETTINGS_DOC, HOMEPAGE_ID));
  return snap.exists()
    ? { ...defaults, ...(snap.data() as Partial<HomepageContent>) }
    : defaults;
}

export async function getSettings(): Promise<Settings> {
  if (USE_MOCK) return { ...mockStore.settings };
  return safeData(fetchSettings, { ...mockStore.settings }, "settings");
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
  if (data.logo) assertPersistedImageUrl(data.logo, "Logo");

  if (USE_MOCK) {
    mockStore.settings = { ...mockStore.settings, ...data };
    return;
  }

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await setDoc(doc(db, SETTINGS_DOC, SETTINGS_ID), data, { merge: true });
  });
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

  await runFirestoreWrite(async () => {
    const db = getFirestoreDb()!;
    await setDoc(doc(db, SETTINGS_DOC, HOMEPAGE_ID), data, { merge: true });
  });
}
