const DRAFT_PREFIX = "myroach-admin-draft:";

export function loadFormDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveFormDraft(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  const record =
    typeof data === "object" && data !== null
      ? { ...(data as Record<string, unknown>), _savedAt: Date.now() }
      : { value: data, _savedAt: Date.now() };
  const payload = JSON.stringify(record);
  try {
    localStorage.setItem(DRAFT_PREFIX + key, payload);
  } catch {
    try {
      const slim =
        typeof data === "object" && data !== null
          ? { ...(data as Record<string, unknown>), images: [] }
          : data;
      const slimRecord =
        typeof slim === "object" && slim !== null
          ? { ...(slim as Record<string, unknown>), _savedAt: Date.now() }
          : { value: slim, _savedAt: Date.now() };
      localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(slimRecord));
    } catch {
      /* quota exceeded — skip silent */
    }
  }
}

export function clearFormDraft(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_PREFIX + key);
}
