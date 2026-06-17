"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { initFirebase } from "@/lib/firebase";
import { USE_MOCK, STORE_URL } from "@/lib/config";
import { getProducts } from "@/services/product.service";
import { getOrders } from "@/services/order.service";
import { getCustomers } from "@/services/customer.service";
import { getCategories } from "@/services/category.service";

interface SyncState {
  connected: boolean;
  lastSync: Date | null;
  syncing: boolean;
  counts: { products: number; orders: number; customers: number; categories: number };
  storeUrl: string;
  error: string | null;
  refresh: () => Promise<void>;
}

const SyncContext = createContext<SyncState>({
  connected: false,
  lastSync: null,
  syncing: false,
  counts: { products: 0, orders: 0, customers: 0, categories: 0 },
  storeUrl: STORE_URL,
  error: null,
  refresh: async () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(USE_MOCK);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [counts, setCounts] = useState({ products: 0, orders: 0, customers: 0, categories: 0 });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      if (!USE_MOCK) initFirebase();
      const [products, orders, customers, categories] = await Promise.all([
        getProducts(),
        getOrders(),
        getCustomers(),
        getCategories(),
      ]);
      setCounts({
        products: products.length,
        orders: orders.length,
        customers: customers.length,
        categories: categories.length,
      });
      setConnected(true);
      setLastSync(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
      setConnected(false);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { refresh(); }, 0);
    const interval = setInterval(() => refresh(), 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refresh]);

  return (
    <SyncContext.Provider value={{ connected, lastSync, syncing, counts, storeUrl: STORE_URL, error, refresh }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
