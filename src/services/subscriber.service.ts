import { collection, getDocs } from "firebase/firestore";
import { db, initFirebase } from "@/lib/firebase";
import { toDate, toString, toBool } from "@/lib/firestore-helpers";
import { safeList } from "@/lib/safe-async";
import { USE_MOCK } from "@/lib/config";
import type { Subscriber } from "@/types";

const COLS = ["subscribers", "newsletter"];

const mockSubs: Subscriber[] = [
  { id: "sub-1", email: "fan@example.com", active: true, createdAt: new Date() },
];

function fromFirestore(id: string, data: Record<string, unknown>): Subscriber {
  return {
    id,
    email: toString(data.email),
    active: toBool(data.active, true),
    createdAt: toDate(data.createdAt),
  };
}

async function fetchSubscribers(): Promise<Subscriber[]> {
  initFirebase();
  if (!db) return [];
  for (const col of COLS) {
    try {
      const snap = await getDocs(collection(db, col));
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => fromFirestore(d.id, d.data()));
      }
    } catch {
      continue;
    }
  }
  return [];
}

export async function getSubscribers(): Promise<Subscriber[]> {
  if (USE_MOCK) return [...mockSubs];
  return safeList(fetchSubscribers, "subscribers");
}

export async function exportSubscribersCsv(): Promise<string> {
  const subs = await getSubscribers();
  const rows = ["email,active,joined", ...subs.map((s) => `${s.email},${s.active},${s.createdAt.toISOString()}`)];
  return rows.join("\n");
}
