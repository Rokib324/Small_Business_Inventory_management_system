import { prisma as defaultPrisma } from "@/lib/db/prisma";
import { PaymentMethod, PrismaClient } from "@prisma/client";

export interface CreatePurchaseItemInput {
  productId: string;
  quantity: number;
  buyPricePoisha: number;
}

export interface CreatePurchaseTransactionInput {
  shopId: string;
  userId?: string | null;
  supplierId?: string | null;
  clientId?: string | null;
  invoiceNumber?: string;
  items: CreatePurchaseItemInput[];
  paidPoisha?: number;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}

/**
 * Pure calculation for purchase totals
 */
export function calculatePurchaseTotals(
  items: Array<{ quantity: number; buyPricePoisha: number }>,
  paidPoisha: number = 0
) {
  const subtotalPoisha = items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.buyPricePoisha),
    0
  );
  const totalPoisha = subtotalPoisha;
  const safePaidPoisha = Math.min(Math.max(0, paidPoisha), totalPoisha);
  const duePoisha = Math.max(0, totalPoisha - safePaidPoisha);

  return {
    subtotalPoisha,
    totalPoisha,
    paidPoisha: safePaidPoisha,
    duePoisha,
  };
}

/**
 * Atomic Purchase Creation Transaction (PROJECT_RULES Rule 5 & Phase 2 Rule)
 * ONE Prisma transaction for:
 * 1. Purchase record
 * 2. PurchaseItems snapshots
 * 3. StockMovements (inflow +)
 * 4. Product stock increment + updated cost price
 * 5. Supplier ledger entry + updated supplier balance (if credit purchase)
 * 6. AuditLog entry
 */
export async function createPurchaseTransaction(
  input: CreatePurchaseTransactionInput,
  clientPrisma: PrismaClient = defaultPrisma
) {
  const {
    shopId,
    userId,
    supplierId,
    clientId,
    items: inputItems,
    paidPoisha = 0,
    paymentMethod = PaymentMethod.CASH,
    notes,
  } = input;

  if (!shopId) {
    throw new Error("shopId is mandatory for purchase creation.");
  }

  if (!inputItems || inputItems.length === 0) {
    throw new Error("ক্রয়ে কমপক্ষে একটি পণ্য থাকা আবশ্যক (Purchase must contain at least one item).");
  }

  return clientPrisma.$transaction(async (tx) => {
    // 1. Fetch and validate all products
    const productIds = inputItems.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        shopId,
        deletedAt: null,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("এক বা একাধিক পণ্য পাওয়া যায়নি বা এই দোকানের অন্তর্গত নয় (Products not found).");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Compute totals in integer poisha
    const totals = calculatePurchaseTotals(inputItems, paidPoisha);

    // 3. Validate credit purchase: if remaining due > 0, supplier is mandatory
    if (totals.duePoisha > 0 && !supplierId) {
      throw new Error("বাকি ক্রয়ের জন্য সাপ্লায়ার (মহাজন) নির্বাচন করা আবশ্যক (Supplier is required for due purchases).");
    }

    // 4. Validate supplier if provided
    let supplier = null;
    if (supplierId) {
      supplier = await tx.supplier.findFirst({
        where: { id: supplierId, shopId, deletedAt: null },
      });
      if (!supplier) {
        throw new Error("সাপ্লায়ার পাওয়া যায়নি (Supplier not found).");
      }
    }

    // 5. Generate Invoice Number if not provided
    let invoiceNumber = input.invoiceNumber;
    if (!invoiceNumber) {
      const purchaseCount = await tx.purchase.count({ where: { shopId } });
      const year = new Date().getFullYear();
      invoiceNumber = `PUR-${year}-${String(purchaseCount + 1).padStart(4, "0")}`;
    }

    // 6. Create Purchase record
    const purchase = await tx.purchase.create({
      data: {
        shopId,
        clientId: clientId || null,
        invoiceNumber,
        supplierId: supplierId || null,
        userId: userId || null,
        subtotalPoisha: totals.subtotalPoisha,
        totalPoisha: totals.totalPoisha,
        paidPoisha: totals.paidPoisha,
        duePoisha: totals.duePoisha,
        paymentMethod,
        notes: notes || null,
      },
    });

    // 7. Create Purchase Items, Stock Movements, and increment Product stock
    for (const item of inputItems) {
      const product = productMap.get(item.productId)!;
      const itemSubtotal = item.quantity * item.buyPricePoisha;

      // Create PurchaseItem snapshot
      await tx.purchaseItem.create({
        data: {
          shopId,
          purchaseId: purchase.id,
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          quantity: item.quantity,
          buyPricePoisha: item.buyPricePoisha,
          subtotalPoisha: itemSubtotal,
        },
      });

      // Create StockMovement (positive quantity for inflow)
      await tx.stockMovement.create({
        data: {
          shopId,
          productId: product.id,
          quantity: item.quantity,
          movementType: "PURCHASE",
          referenceType: "PURCHASE_ORDER",
          referenceId: purchase.id,
          note: `ক্রয় চালান #${invoiceNumber}`,
        },
      });

      // Increment cached stock and update latest buyPricePoisha
      await tx.product.update({
        where: { id: product.id },
        data: {
          cachedStock: { increment: item.quantity },
          buyPricePoisha: item.buyPricePoisha,
        },
      });
    }

    // 8. If due amount exists and supplier is linked, update supplier balance & append LedgerEntry
    if (totals.duePoisha > 0 && supplierId) {
      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          cachedBalancePoisha: { increment: totals.duePoisha },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          shopId,
          supplierId,
          purchaseId: purchase.id,
          entryType: "SUPPLIER_PURCHASE",
          creditPoisha: totals.duePoisha, // credit represents increase in supplier payable
          balanceAfterPoisha: updatedSupplier.cachedBalancePoisha,
          referenceType: "PURCHASE",
          referenceId: purchase.id,
          description: `ক্রয় চালানের বাকি #${invoiceNumber}`,
        },
      });
    }

    // 9. Write AuditLog
    await tx.auditLog.create({
      data: {
        shopId,
        userId: userId || null,
        action: "CREATE",
        entityType: "Purchase",
        entityId: purchase.id,
        newValues: {
          invoiceNumber,
          supplierId,
          totalPoisha: totals.totalPoisha,
          paidPoisha: totals.paidPoisha,
          duePoisha: totals.duePoisha,
          itemCount: inputItems.length,
        },
      },
    });

    // 10. Return complete purchase object
    return tx.purchase.findUnique({
      where: { id: purchase.id },
      include: {
        supplier: true,
        items: true,
      },
    });
  });
}
