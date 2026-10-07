/**
 * Baki (বাকি) - Client Sync Engine
 * Coordinates Dexie offline queue and /api/sync endpoint.
 * Handles online/offline transitions, idempotency, delta updates, and auth expiry.
 */

import {
  getPendingSyncActions,
  removeSyncActionByClientId,
  markSyncActionStatus,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  cacheProducts,
  cacheCustomers,
  getAllSyncQueue,
} from "./db";
import { SyncResponse } from "@/features/sync/schemas";

export type ConnectionStatus = "ONLINE" | "OFFLINE" | "SYNCING" | "AUTH_EXPIRED";

export interface SyncEngineState {
  status: ConnectionStatus;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
  errorMessage?: string | null;
}

type SyncStateListener = (state: SyncEngineState) => void;

class SyncEngine {
  private isSyncing = false;
  private listeners = new Set<SyncStateListener>();
  private currentState: SyncEngineState = {
    status: typeof navigator !== "undefined" && navigator.onLine ? "ONLINE" : "OFFLINE",
    pendingCount: 0,
    failedCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          this.sync();
        }
      });
      // Initial state sync
      this.refreshCounts();
    }
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.currentState });
    }
  }

  public async refreshCounts() {
    try {
      const allQueue = await getAllSyncQueue();
      const pending = allQueue.filter((i) => i.status === "PENDING" || i.status === "SYNCING");
      const failed = allQueue.filter((i) => i.status === "FAILED");
      const lastSync = await getLastSyncTimestamp();

      this.currentState.pendingCount = pending.length;
      this.currentState.failedCount = failed.length;
      this.currentState.lastSyncedAt = lastSync;
      this.notify();
    } catch (e) {
      console.warn("[SyncEngine] Failed to refresh counts:", e);
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (isOnline) {
      this.currentState.status = "ONLINE";
      this.currentState.errorMessage = null;
      this.notify();
      this.sync();
    } else {
      this.currentState.status = "OFFLINE";
      this.notify();
    }
  }

  public async sync(): Promise<void> {
    if (this.isSyncing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.currentState.status = "OFFLINE";
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.currentState.status = "SYNCING";
    this.notify();

    try {
      const pendingItems = await getPendingSyncActions();
      const lastSyncAt = await getLastSyncTimestamp();

      // Mark items as SYNCING in local DB
      for (const item of pendingItems) {
        if (item.id) {
          await markSyncActionStatus(item.id, "SYNCING");
        }
      }

      // Format payload for /api/sync
      const requestPayload = {
        actions: pendingItems.map((item) => ({
          clientId: item.clientId,
          actionType: item.actionType,
          createdAt: item.createdAt,
          payload: item.payload,
        })),
        lastSyncAt,
      };

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (response.status === 401) {
        // Expired login: KEEP DATA in queue and notify user to log in again
        this.currentState.status = "AUTH_EXPIRED";
        this.currentState.errorMessage = "আপনার সেশন মেয়াদোত্তীর্ণ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।";
        // Revert status to PENDING
        for (const item of pendingItems) {
          if (item.id) {
            await markSyncActionStatus(item.id, "PENDING");
          }
        }
        await this.refreshCounts();
        this.notify();
        return;
      }

      if (!response.ok) {
        throw new Error(`সার্ভার ত্রুটি: ${response.status}`);
      }

      const data: SyncResponse = await response.json();

      // Process per-action server results
      for (const res of data.results) {
        if (res.status === "SUCCESS" || res.status === "DUPLICATE") {
          // Remove from local queue only after server confirmation
          await removeSyncActionByClientId(res.clientId);
        } else if (res.status === "REJECTED") {
          const item = pendingItems.find((i) => i.clientId === res.clientId);
          if (item && item.id) {
            await markSyncActionStatus(item.id, "FAILED", res.reason);
          }
        }
      }

      // Ingest delta updates into Dexie tables
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

      this.currentState.status = "ONLINE";
      this.currentState.errorMessage = null;
      await this.refreshCounts();
    } catch (error: unknown) {
      console.error("[SyncEngine] Sync failure:", error);
      this.currentState.status = typeof navigator !== "undefined" && !navigator.onLine ? "OFFLINE" : "ONLINE";
      this.currentState.errorMessage = error instanceof Error ? error.message : "সিঙ্ক সম্পন্ন করা যায়নি।";
      await this.refreshCounts();
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  public async retryFailed(): Promise<void> {
    const queue = await getAllSyncQueue();
    const failedItems = queue.filter((i) => i.status === "FAILED");
    for (const item of failedItems) {
      if (item.id) {
        await markSyncActionStatus(item.id, "PENDING", null);
      }
    }
    await this.sync();
  }

  public getState(): SyncEngineState {
    return { ...this.currentState };
  }
}

// Global singleton
export const syncEngine = new SyncEngine();
