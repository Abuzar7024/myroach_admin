"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useSync } from "@/providers/sync-provider";
import { USE_MOCK } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SyncStatusBar() {
  const { connected, lastSync, syncing, counts, error, refresh } = useSync();

  return (
    <div className={cn(
      "mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2 text-xs",
      connected ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
    )}>
      {connected ? <Wifi size={14} className="text-green-600" /> : <WifiOff size={14} className="text-amber-600" />}
      <span className="font-medium text-zinc-800">
        {USE_MOCK ? "Mock Data" : "Firebase Live Sync"}
      </span>
      {connected && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{counts.products} products</Badge>
          <Badge variant="secondary">{counts.orders} orders</Badge>
          <Badge variant="secondary">{counts.customers} customers</Badge>
          <Badge variant="secondary">{counts.categories} categories</Badge>
        </div>
      )}
      {lastSync && (
        <span className="text-zinc-500">
          Synced {lastSync.toLocaleTimeString()}
        </span>
      )}
      {error && <span className="text-red-600">{error}</span>}
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-7 gap-1 text-xs"
        onClick={refresh}
        disabled={syncing}
      >
        <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
        Sync
      </Button>
    </div>
  );
}
