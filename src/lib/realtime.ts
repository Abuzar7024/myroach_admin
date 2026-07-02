import { collection, onSnapshot, type Firestore } from "firebase/firestore";
import { getFirestoreDb, initFirebase } from "@/lib/firebase";

export function subscribeCollection(
  db: Firestore,
  collectionName: string,
  onData: (
    changes: { type: string; id: string; data: Record<string, unknown> }[],
    meta: { fromCache: boolean }
  ) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const changes = snapshot.docChanges().map((change) => ({
        type: change.type,
        id: change.doc.id,
        data: change.doc.data() as Record<string, unknown>,
      }));
      onData(changes, { fromCache: snapshot.metadata.fromCache });
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export function getRealtimeDb() {
  if (typeof window === "undefined") return null;
  initFirebase();
  return getFirestoreDb() ?? null;
}
