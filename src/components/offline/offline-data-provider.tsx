"use client";

import { useEffect } from "react";
import { syncEngine } from "@/lib/offline/sync-engine";
import { cacheProducts, cacheCustomers, setLastSyncTimestamp } from "@/lib/offline/db";

export function OfflineDataProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Prefetch products and customers into Dexie on initial load
    async function initOfflineCache() {
      if (!navigator.onLine) return;

      try {
        const res = await fetch("/api/sync");
        if (res.ok) {
          const data = await res.json();
          if (data.delta) {
            if (data.delta.products && data.delta.products.length > 0) {
              await cacheProducts(data.delta.products);
            }
            if (data.delta.customers && data.delta.customers.length > 0) {
              await cacheCustomers(data.delta.customers);
            }
            if (data.delta.syncedAt) {
              await setLastSyncTimestamp(data.delta.syncedAt);
            }
          }
        }
      } catch (err) {
        console.warn("[OfflineDataProvider] Initial cache warm-up error:", err);
      } finally {
        // Run sync in case there are pending offline actions
        syncEngine.sync();
      }
    }

    initOfflineCache();
  }, []);

  return null;
}
