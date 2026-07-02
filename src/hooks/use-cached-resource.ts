"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { readCache, writeCache } from "@/lib/local-cache";

interface Options {
  enabled?: boolean;
}

interface CachedResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<T | null>;
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * Stale-while-revalidate around a one-shot fetcher.
 * Seeds state from localStorage so the page paints instantly (no loader flash)
 * when cached data exists, then revalidates from the fetcher and updates the cache.
 * On fetch failure the cached data is kept and an error is surfaced.
 */
export function useCachedResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  { enabled = true }: Options = {}
): CachedResource<T> {
  const [data, setData] = useState<T | null>(() => (enabled ? readCache<T>(key) : null));
  const [loading, setLoading] = useState<boolean>(() => (enabled ? readCache<T>(key) == null : true));
  const [error, setError] = useState<string | null>(null);

  // Callers pass a stable fetcher (a module function or a useCallback), so it's
  // safe for refresh to depend on its identity.
  const refresh = useCallback(async () => {
    try {
      const fresh = await fetcher();
      setData(fresh);
      if (enabled) writeCache(key, fresh);
      setError(null);
      return fresh;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      return null;
    } finally {
      setLoading(false);
    }
  }, [key, enabled, fetcher]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}
