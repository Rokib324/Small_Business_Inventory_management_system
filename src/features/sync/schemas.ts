/**
 * Baki (বাকি) - Offline Sync Validation Schemas
 */

import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const SyncCreateCustomerPayloadSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  name: z.string().min(1, "Customer name is required").trim(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const SyncCreateSalePayloadSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  invoiceNumber: z.string().optional(),
  customerId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().positive("Quantity must be positive"),
        unitPricePoisha: z.number().int().nonnegative().optional(),
      })
    )
    .min(1, "At least one item is required"),
  discountPoisha: z.number().int().nonnegative().default(0),
  paidPoisha: z.number().int().nonnegative().default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().optional().nullable(),
});

export const SyncReceivePaymentPayloadSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  amountPoisha: z.number().int().positive("Amount must be positive"),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const SyncActionItemSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  actionType: z.enum(["CREATE_CUSTOMER", "CREATE_SALE", "RECEIVE_PAYMENT"]),
  createdAt: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export const SyncRequestSchema = z.object({
  actions: z.array(SyncActionItemSchema),
  lastSyncAt: z.string().optional().nullable(),
});

export type SyncActionItem = z.infer<typeof SyncActionItemSchema>;
export type SyncRequest = z.infer<typeof SyncRequestSchema>;

export type SyncActionResultStatus = "SUCCESS" | "DUPLICATE" | "REJECTED";

export interface SyncActionResult {
  clientId: string;
  actionType: "CREATE_CUSTOMER" | "CREATE_SALE" | "RECEIVE_PAYMENT";
  status: SyncActionResultStatus;
  serverId?: string;
  reason?: string;
}

export interface SyncResponse {
  results: SyncActionResult[];
  delta: {
    products: Array<{
      id: string;
      shopId: string;
      name: string;
      sku: string | null;
      unit: string;
      buyPricePoisha: number;
      sellPricePoisha: number;
      cachedStock: number;
      lowStockThreshold: number;
      updatedAt: string;
    }>;
    customers: Array<{
      id: string;
      clientId: string | null;
      shopId: string;
      name: string;
      phone: string | null;
      address: string | null;
      cachedBalancePoisha: number;
      updatedAt: string;
    }>;
    syncedAt: string;
  };
}
