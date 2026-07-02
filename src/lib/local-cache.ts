/**
 * Best-effort localStorage cache for admin data (products, orders, dashboard…).
 * Lets pages paint instantly from the last known data while fresh data loads
 * from Firestore in the background (stale-while-revalidate).
 *
 * Cached payloads are cleared on logout (see auth-provider) so a different
 * admin on the same machine never sees the previous session's data.
 */

const PREFIX = "admin-cache:";
// Bump when a cached payload's shape changes so old entries are ignored.
const VERSION = 1;

// Firestore reads return Date objects; JSON serialization turns them into
// ISO strings. Revive those strings back into Date for known date fields.
const DATE_KEYS = new Set(["createdAt", "updatedAt", "expiryDate", "timestamp", "at"]);
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function reviver(key: string, value: unknown): unknown {
  if (typeof value === "string" && DATE_KEYS.has(key) && ISO_DATETIME.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return value;
}

interface CacheEntry<T> {
  v: number;
  t: number;
  data: T;
}

/** Read a cached value. Returns null on miss, version mismatch, or if older than maxAgeMs. */
export function readCache<T>(key: string, maxAgeMs = Infinity): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw, reviver) as CacheEntry<T>;
    if (!entry || entry.v !== VERSION) return null;
    if (maxAgeMs !== Infinity && Date.now() - entry.t > maxAgeMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/** Store a value. Silently no-ops on serialization failure or quota errors. */
export function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { v: VERSION, t: Date.now(), data };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // best-effort — ignore quota / serialization errors
  }
}

/** Remove one cached key, or all admin-cache entries when no key is given. */
export function clearCache(key?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key) {
      window.localStorage.removeItem(PREFIX + key);
      return;
    }
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
