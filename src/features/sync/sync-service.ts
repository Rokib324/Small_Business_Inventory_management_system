/**
 * Baki (বাকি) - Offline Sync Engine Service
 * Processes queued client actions idempotently using (shopId, clientId).
 * Conflict rules:
 * - Sales, payments, and ledger entries are append-only.
 * - If stock would go negative on sync, accept the sale and flag product for review.
 * - Customer & product updates: last write wins by updatedAt.
 */

import { prisma } from "@/lib/db/prisma";
import {
  SyncActionItem,
  SyncActionResult,
  SyncCreateCustomerPayloadSchema,
  SyncCreateSalePayloadSchema,
  SyncReceivePaymentPayloadSchema,
  SyncResponse,
} from "./schemas";
import { createSaleTransaction } from "@/features/sales/service";
import { logAudit } from "@/lib/audit";
import { LedgerEntryType, LedgerReferenceType } from "@prisma/client";

interface ProcessSyncParams {
  shopId: string;
  userId: string;
  actions: SyncActionItem[];
  lastSyncAt?: string | null;
}

export async function processSyncRequest({
  shopId,
  userId,
  actions,
  lastSyncAt,
}: ProcessSyncParams): Promise<SyncResponse> {
  const results: SyncActionResult[] = [];

  for (const action of actions) {
    try {
      if (action.actionType === "CREATE_CUSTOMER") {
        const parsed = SyncCreateCustomerPayloadSchema.safeParse(action.payload);
        if (!parsed.success) {
          results.push({
            clientId: action.clientId,
            actionType: "CREATE_CUSTOMER",
            status: "REJECTED",
            reason: parsed.error.issues.map((i) => i.message).join(", "),
          });
          continue;
        }

        const data = parsed.data;

        // Idempotency check: (shopId, clientId)
        const existing = await prisma.customer.findFirst({
          where: { shopId, clientId: data.clientId, deletedAt: null },
        });

        if (existing) {
          results.push({
            clientId: action.clientId,
            actionType: "CREATE_CUSTOMER",
            status: "DUPLICATE",
            serverId: existing.id,
          });
          continue;
        }

        // Create new customer
        const customer = await prisma.customer.create({
          data: {
            shopId,
            clientId: data.clientId,
            name: data.name,
            phone: data.phone || null,
            address: data.address || null,
            cachedBalancePoisha: 0,
          },
        });

        await logAudit({
          shopId,
          userId,
          action: "CREATE",
          entityType: "Customer",
          entityId: customer.id,
          newValues: customer,
        });

        results.push({
          clientId: action.clientId,
          actionType: "CREATE_CUSTOMER",
          status: "SUCCESS",
          serverId: customer.id,
        });
      } else if (action.actionType === "CREATE_SALE") {
        const parsed = SyncCreateSalePayloadSchema.safeParse(action.payload);
        if (!parsed.success) {
          results.push({
            clientId: action.clientId,
            actionType: "CREATE_SALE",
            status: "REJECTED",
            reason: parsed.error.issues.map((i) => i.message).join(", "),
          });
          continue;
        }

        const data = parsed.data;

        // Idempotency check: (shopId, clientId)
        const existing = await prisma.sale.findFirst({
          where: { shopId, clientId: data.clientId, deletedAt: null },
        });

        if (existing) {
          results.push({
            clientId: action.clientId,
            actionType: "CREATE_SALE",
            status: "DUPLICATE",
            serverId: existing.id,
          });
          continue;
        }

        // Resolve customer ID: might be an offline clientId
        let resolvedCustomerId = data.customerId || null;
        if (resolvedCustomerId) {
          const directMatch = await prisma.customer.findFirst({
            where: { id: resolvedCustomerId, shopId, deletedAt: null },
          });

          if (!directMatch) {
            // Check if customerId was actually a clientId created offline in this sync batch
            const clientMatch = await prisma.customer.findFirst({
              where: { clientId: resolvedCustomerId, shopId, deletedAt: null },
            });
            if (clientMatch) {
              resolvedCustomerId = clientMatch.id;
            }
          }
        }

        // Execute sale transaction (handles negative stock review flagging)
        const sale = await createSaleTransaction({
          shopId,
          userId,
          clientId: data.clientId,
          invoiceNumber: data.invoiceNumber,
          customerId: resolvedCustomerId,
          items: data.items,
          discountPoisha: data.discountPoisha,
          paidPoisha: data.paidPoisha,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
        });

        results.push({
          clientId: action.clientId,
          actionType: "CREATE_SALE",
          status: "SUCCESS",
          serverId: sale.id,
        });
      } else if (action.actionType === "RECEIVE_PAYMENT") {
        const parsed = SyncReceivePaymentPayloadSchema.safeParse(action.payload);
        if (!parsed.success) {
          results.push({
            clientId: action.clientId,
            actionType: "RECEIVE_PAYMENT",
            status: "REJECTED",
            reason: parsed.error.issues.map((i) => i.message).join(", "),
          });
          continue;
        }

        const data = parsed.data;

        // Idempotency check: (shopId, clientId)
        const existing = await prisma.payment.findFirst({
          where: { shopId, clientId: data.clientId, deletedAt: null },
        });

        if (existing) {
          results.push({
            clientId: action.clientId,
            actionType: "RECEIVE_PAYMENT",
            status: "DUPLICATE",
            serverId: existing.id,
          });
          continue;
        }

        // Resolve customer ID
        let targetCustomerId = data.customerId;
        const directCustomer = await prisma.customer.findFirst({
          where: { id: targetCustomerId, shopId, deletedAt: null },
        });

        if (!directCustomer) {
          const clientCustomer = await prisma.customer.findFirst({
            where: { clientId: targetCustomerId, shopId, deletedAt: null },
          });
          if (clientCustomer) {
            targetCustomerId = clientCustomer.id;
          } else {
            results.push({
              clientId: action.clientId,
              actionType: "RECEIVE_PAYMENT",
              status: "REJECTED",
              reason: "Customer not found on server",
            });
            continue;
          }
        }

        // Atomic payment receipt
        const payment = await prisma.$transaction(async (tx) => {
          const customer = await tx.customer.findFirst({
            where: { id: targetCustomerId, shopId, deletedAt: null },
          });

          if (!customer) {
            throw new Error("Customer not found.");
          }

          const newBalancePoisha = customer.cachedBalancePoisha - data.amountPoisha;

          const p = await tx.payment.create({
            data: {
              shopId,
              clientId: data.clientId,
              customerId: customer.id,
              amountPoisha: data.amountPoisha,
              method: data.method,
              reference: data.reference ? data.reference.trim() : null,
              note: data.note ? data.note.trim() : null,
              receivedById: userId,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              shopId,
              clientId: `${data.clientId}-ledger`,
              customerId: customer.id,
              entryType: LedgerEntryType.PAYMENT_RECEIVED,
              debitPoisha: 0,
              creditPoisha: data.amountPoisha,
              balanceAfterPoisha: newBalancePoisha,
              referenceType: LedgerReferenceType.PAYMENT,
              referenceId: p.id,
              description: `অফলাইন জমা পরিশোধ (${data.method}${
                data.reference ? ` - ${data.reference}` : ""
              })`,
            },
          });

          await tx.customer.update({
            where: { id: customer.id },
            data: {
              cachedBalancePoisha: newBalancePoisha,
            },
          });

          await logAudit({
            shopId,
            userId,
            action: "CREATE",
            entityType: "Payment",
            entityId: p.id,
            newValues: {
              clientId: data.clientId,
              customerId: customer.id,
              amountPoisha: data.amountPoisha,
              newBalancePoisha,
            },
            tx,
          });

          return p;
        });

        results.push({
          clientId: action.clientId,
          actionType: "RECEIVE_PAYMENT",
          status: "SUCCESS",
          serverId: payment.id,
        });
      }
    } catch (err: unknown) {
      console.error(`Error processing sync action ${action.clientId}:`, err);
      const reason = err instanceof Error ? err.message : "Unknown error during sync execution";
      results.push({
        clientId: action.clientId,
        actionType: action.actionType,
        status: "REJECTED",
        reason,
      });
    }
  }

  // --------------------------------------------------
  // Pull Delta updates since lastSyncAt
  // --------------------------------------------------
  const sinceDate = lastSyncAt ? new Date(lastSyncAt) : new Date(0);

  const [changedProducts, changedCustomers] = await Promise.all([
    prisma.product.findMany({
      where: {
        shopId,
        deletedAt: null,
        updatedAt: { gt: sinceDate },
      },
      select: {
        id: true,
        shopId: true,
        name: true,
        sku: true,
        unit: true,
        buyPricePoisha: true,
        sellPricePoisha: true,
        cachedStock: true,
        lowStockThreshold: true,
        updatedAt: true,
      },
    }),
    prisma.customer.findMany({
      where: {
        shopId,
        deletedAt: null,
        updatedAt: { gt: sinceDate },
      },
      select: {
        id: true,
        clientId: true,
        shopId: true,
        name: true,
        phone: true,
        address: true,
        cachedBalancePoisha: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    results,
    delta: {
      products: changedProducts.map((p) => ({
        ...p,
        updatedAt: p.updatedAt.toISOString(),
      })),
      customers: changedCustomers.map((c) => ({
        ...c,
        updatedAt: c.updatedAt.toISOString(),
      })),
      syncedAt: new Date().toISOString(),
    },
  };
}
