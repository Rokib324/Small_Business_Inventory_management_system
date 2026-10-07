/**
 * Baki (বাকি) - Offline IndexedDB Database (Dexie)
 * Caches products and customers locally.
 * Manages atomic offline sync action queue with client-generated UUIDs.
 */

import Dexie, { type Table } from "dexie";

export interface OfflineProduct {
  id: string;
  shopId: string;
  name: string;
  sku?: string | null;
  unit: string;
  buyPricePoisha: number;
  sellPricePoisha: number;
  cachedStock: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface OfflineCustomer {
  id: string;
  clientId?: string | null;
  shopId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  cachedBalancePoisha: number;
  updatedAt: string;
}

export type SyncActionType = "CREATE_CUSTOMER" | "CREATE_SALE" | "RECEIVE_PAYMENT";
export type SyncActionStatus = "PENDING" | "SYNCING" | "FAILED";

export interface SyncQueueItem {
  id?: number;
  clientId: string; // Client-generated UUID for idempotency
  actionType: SyncActionType;
  payload: Record<string, unknown>;
  createdAt: string; // ISO timestamp
  status: SyncActionStatus;
  errorMessage?: string | null;
  retryCount: number;
}

export interface SyncMetaItem {
  key: string;
  value: string;
}

export class BakiOfflineDatabase extends Dexie {
  products!: Table<OfflineProduct, string>;
  customers!: Table<OfflineCustomer, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  syncMeta!: Table<SyncMetaItem, string>;

  constructor() {
    super("BakiOfflineDb");
    this.version(1).stores({
      products: "id, shopId, name, sku, updatedAt",
      customers: "id, clientId, shopId, name, phone, updatedAt",
      syncQueue: "++id, clientId, actionType, status, createdAt",
      syncMeta: "key",
    });
  }
}

// Global singleton for client-side
let dbInstance: BakiOfflineDatabase | null = null;

export function getOfflineDb(): BakiOfflineDatabase {
  if (typeof window === "undefined") {
    // Return empty placeholder or handle SSR gracefully
    return new BakiOfflineDatabase();
  }
  if (!dbInstance) {
    dbInstance = new BakiOfflineDatabase();
  }
  return dbInstance;
}

// ----------------------------------------------------
// Product Cache Helpers
// ----------------------------------------------------

export async function cacheProducts(products: OfflineProduct[]): Promise<void> {
  const db = getOfflineDb();
  await db.transaction("rw", db.products, async () => {
    for (const p of products) {
      await db.products.put(p);
    }
  });
}

export async function getOfflineProducts(
  shopId: string,
  search?: string
): Promise<OfflineProduct[]> {
  const db = getOfflineDb();
  const collection = db.products.where("shopId").equals(shopId);

  let results = await collection.toArray();
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }
  return results.sort((a, b) => a.name.localeCompare(b.name, "bn"));
}

export async function updateLocalProductStock(
  productId: string,
  quantityDelta: number
): Promise<void> {
  const db = getOfflineDb();
  const product = await db.products.get(productId);
  if (product) {
    product.cachedStock += quantityDelta;
    await db.products.put(product);
  }
}

// ----------------------------------------------------
// Customer Cache Helpers
// ----------------------------------------------------

export async function cacheCustomers(customers: OfflineCustomer[]): Promise<void> {
  const db = getOfflineDb();
  await db.transaction("rw", db.customers, async () => {
    for (const c of customers) {
      await db.customers.put(c);
    }
  });
}

export async function getOfflineCustomers(
  shopId: string,
  search?: string
): Promise<OfflineCustomer[]> {
  const db = getOfflineDb();
  const collection = db.customers.where("shopId").equals(shopId);

  let results = await collection.toArray();
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }
  return results.sort((a, b) => a.name.localeCompare(b.name, "bn"));
}

export async function addLocalCustomer(customer: OfflineCustomer): Promise<void> {
  const db = getOfflineDb();
  await db.customers.put(customer);
}

export async function updateLocalCustomerBalance(
  customerId: string,
  dueDeltaPoisha: number
): Promise<void> {
  const db = getOfflineDb();
  const customer = await db.customers.get(customerId);
  if (customer) {
    customer.cachedBalancePoisha += dueDeltaPoisha;
    await db.customers.put(customer);
  }
}

// ----------------------------------------------------
// Sync Queue Helpers
// ----------------------------------------------------

export async function enqueueSyncAction(
  actionType: SyncActionType,
  payload: Record<string, unknown>,
  clientId?: string
): Promise<SyncQueueItem> {
  const db = getOfflineDb();
  const cid = clientId || crypto.randomUUID();
  const item: SyncQueueItem = {
    clientId: cid,
    actionType,
    payload,
    createdAt: new Date().toISOString(),
    status: "PENDING",
    errorMessage: null,
    retryCount: 0,
  };

  const id = await db.syncQueue.add(item);
  return { ...item, id };
}

export async function getPendingSyncActions(): Promise<SyncQueueItem[]> {
  const db = getOfflineDb();
  return db.syncQueue
    .where("status")
    .equals("PENDING")
    .or("status")
    .equals("FAILED")
    .sortBy("id");
}

export async function getAllSyncQueue(): Promise<SyncQueueItem[]> {
  const db = getOfflineDb();
  return db.syncQueue.orderBy("id").toArray();
}

export async function markSyncActionStatus(
  id: number,
  status: SyncActionStatus,
  errorMessage?: string | null
): Promise<void> {
  const db = getOfflineDb();
  const currentItem = await db.syncQueue.get(id);
  await db.syncQueue.update(id, {
    status,
    errorMessage: errorMessage || null,
    retryCount: status === "FAILED" ? (currentItem?.retryCount || 0) + 1 : 0,
  });
}

export async function removeSyncAction(id: number): Promise<void> {
  const db = getOfflineDb();
  await db.syncQueue.delete(id);
}

export async function removeSyncActionByClientId(clientId: string): Promise<void> {
  const db = getOfflineDb();
  await db.syncQueue.where("clientId").equals(clientId).delete();
}

export async function setLastSyncTimestamp(isoTimestamp: string): Promise<void> {
  const db = getOfflineDb();
  await db.syncMeta.put({ key: "lastSyncAt", value: isoTimestamp });
}

export async function getLastSyncTimestamp(): Promise<string | null> {
  const db = getOfflineDb();
  const item = await db.syncMeta.get("lastSyncAt");
  return item ? item.value : null;
}
