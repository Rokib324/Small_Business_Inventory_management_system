import { prisma as defaultPrisma } from "@/lib/db/prisma";
import { PrismaClient, StockMovementType, StockReferenceType } from "@prisma/client";

export interface AdjustStockTransactionInput {
  shopId: string;
  userId?: string | null;
  productId: string;
  adjustmentType: "INCREASE" | "DECREASE";
  quantity: number;
  reason: "DAMAGE" | "COUNT_CORRECTION" | "EXPIRY" | "RETURN_CUSTOMER" | "RETURN_SUPPLIER" | "OTHER";
  note?: string | null;
}

/**
 * Maps reason code to Prisma StockMovementType
 */
export function mapReasonToMovementType(
  reason: AdjustStockTransactionInput["reason"]
): StockMovementType {
  switch (reason) {
    case "DAMAGE":
    case "EXPIRY":
      return StockMovementType.DAMAGE;
    case "RETURN_CUSTOMER":
      return StockMovementType.RETURN_CUSTOMER;
    case "RETURN_SUPPLIER":
      return StockMovementType.RETURN_SUPPLIER;
    case "COUNT_CORRECTION":
    case "OTHER":
    default:
      return StockMovementType.ADJUSTMENT;
  }
}

/**
 * Bengali reason labels
 */
export const reasonLabels: Record<AdjustStockTransactionInput["reason"], string> = {
  DAMAGE: "ক্ষতিগ্রস্ত / নষ্ট (Damage)",
  EXPIRY: "মেয়াদোত্তীর্ণ (Expiry)",
  COUNT_CORRECTION: "গণনা সংশোধন (Count Correction)",
  RETURN_CUSTOMER: "কাস্টমার ফেরত (Customer Return)",
  RETURN_SUPPLIER: "মহাজনকে ফেরত (Supplier Return)",
  OTHER: "অন্যান্য সমন্বয় (Other Adjustment)",
};

/**
 * Calculates sequential running stock for chronological history view.
 * Assumes movements are sorted chronologically ascending.
 */
export function calculateRunningStock<T extends { quantity: number }>(
  movements: T[],
  startingStock: number = 0
): Array<T & { runningStock: number }> {
  let running = startingStock;
  return movements.map((m) => {
    running += m.quantity;
    return {
      ...m,
      runningStock: running,
    };
  });
}

/**
 * Atomic Stock Adjustment Transaction (Phase 2 Rule)
 * ONE Prisma transaction for:
 * 1. StockMovement creation
 * 2. Product cachedStock increment/decrement
 * 3. AuditLog record
 */
export async function adjustStockTransaction(
  input: AdjustStockTransactionInput,
  clientPrisma: PrismaClient = defaultPrisma
) {
  const { shopId, userId, productId, adjustmentType, quantity, reason, note } = input;

  if (!shopId) {
    throw new Error("shopId is mandatory for stock adjustment.");
  }

  if (quantity <= 0) {
    throw new Error("পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।");
  }

  const delta = adjustmentType === "INCREASE" ? quantity : -quantity;
  const movementType = mapReasonToMovementType(reason);

  return clientPrisma.$transaction(async (tx) => {
    // 1. Fetch product and lock
    const product = await tx.product.findFirst({
      where: { id: productId, shopId, deletedAt: null },
    });

    if (!product) {
      throw new Error("পণ্যটি পাওয়া যায়নি বা এই দোকানের অন্তর্গত নয়।");
    }

    const currentStock = product.cachedStock;
    const newStock = currentStock + delta;

    if (newStock < 0) {
      throw new Error(
        `স্টক ঋণাত্মক হতে পারে না। বর্তমান স্টক: ${currentStock}, কমানোর চেষ্টা: ${quantity}`
      );
    }

    const reasonLabel = reasonLabels[reason] || "স্টক সমন্বয়";
    const movementNote = note?.trim()
      ? `${reasonLabel} - ${note.trim()}`
      : reasonLabel;

    // 2. Create StockMovement
    const movement = await tx.stockMovement.create({
      data: {
        shopId,
        productId,
        quantity: delta,
        movementType,
        referenceType: StockReferenceType.MANUAL_ADJUSTMENT,
        note: movementNote,
      },
    });

    // 3. Update cachedStock on Product
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        cachedStock: newStock,
      },
    });

    // 4. Record AuditLog
    await tx.auditLog.create({
      data: {
        shopId,
        userId: userId || null,
        action: "UPDATE",
        entityType: "Product",
        entityId: productId,
        oldValues: {
          cachedStock: currentStock,
        },
        newValues: {
          cachedStock: newStock,
          deltaQuantity: delta,
          adjustmentType,
          reason,
          note: movementNote,
        },
      },
    });

    return {
      product: updatedProduct,
      movement,
    };
  });
}
