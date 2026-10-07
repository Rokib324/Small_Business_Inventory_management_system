/**
 * Baki (বাকি) - Atomic Sale Transaction Service
 * Rule 5: Sale creation (sale + items + stock movements + ledger entry) happens in ONE Prisma transaction.
 */

import { prisma } from "@/lib/db/prisma";
import { calculateSaleTotals } from "./utils";
import { PaymentMethod, Product } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export interface CreateSaleInput {
  shopId: string;
  userId?: string | null;
  customerId?: string | null;
  clientId?: string | null;
  invoiceNumber?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPricePoisha?: number; // Optional override; defaults to product.sellPricePoisha
  }>;
  discountPoisha?: number;
  paidPoisha?: number;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}

export async function createSaleTransaction(
  input: CreateSaleInput,
  clientPrisma = prisma
) {
  const {
    shopId,
    userId,
    customerId,
    clientId,
    items: inputItems,
    discountPoisha = 0,
    paidPoisha = 0,
    paymentMethod = PaymentMethod.CASH,
    notes,
  } = input;

  if (!shopId) {
    throw new Error("shopId is mandatory for sale creation.");
  }

  if (!inputItems || inputItems.length === 0) {
    throw new Error("Sale must contain at least one item.");
  }

  // Execute entire sequence atomically inside prisma.$transaction
  return clientPrisma.$transaction(async (tx) => {
    // 1. Fetch and validate all products
    const productIds = inputItems.map((i) => i.productId);
    const products: Product[] = await tx.product.findMany({
      where: {
        id: { in: productIds },
        shopId,
        deletedAt: null,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("One or more products were not found or do not belong to this shop.");
    }

    const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

    // 2. Prepare cart line items
    const cartItems = inputItems.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: item.quantity,
        unitPricePoisha:
          item.unitPricePoisha !== undefined
            ? item.unitPricePoisha
            : product.sellPricePoisha,
        buyPricePoisha: product.buyPricePoisha,
      };
    });

    // 3. Calculate totals using pure money calculation
    const totals = calculateSaleTotals(cartItems, discountPoisha, paidPoisha);

    // 4. Validate credit sale (due amount requires a registered customer)
    if (totals.duePoisha > 0 && !customerId) {
      throw new Error("বাকি বিক্রির জন্য কাস্টমার নির্বাচন করা আবশ্যক (Customer is required for due sales).");
    }

    // 5. Fetch customer if provided
    let customer = null;
    if (customerId) {
      customer = await tx.customer.findFirst({
        where: { id: customerId, shopId, deletedAt: null },
      });
      if (!customer) {
        throw new Error("Customer not found or does not belong to this shop.");
      }
    }

    // 6. Generate Invoice Number if not provided
    let invoiceNumber = input.invoiceNumber;
    if (!invoiceNumber) {
      const salesCount = await tx.sale.count({ where: { shopId } });
      const year = new Date().getFullYear();
      invoiceNumber = `INV-${year}-${String(salesCount + 1).padStart(4, "0")}`;
    }

    // 7. Create Sale record
    const sale = await tx.sale.create({
      data: {
        shopId,
        clientId: clientId || null,
        invoiceNumber,
        customerId: customerId || null,
        userId: userId || null,
        subtotalPoisha: totals.subtotalPoisha,
        discountPoisha: totals.discountPoisha,
        totalPoisha: totals.totalPoisha,
        paidPoisha: totals.paidPoisha,
        duePoisha: totals.duePoisha,
        paymentMethod,
        status: "COMPLETED",
        notes: notes || null,
      },
    });

    // 8. Create Sale Items, Stock Movements and decrement cached stock
    for (const item of totals.items) {
      // Create SaleItem snapshot
      await tx.saleItem.create({
        data: {
          shopId,
          saleId: sale.id,
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPricePoisha: item.unitPricePoisha,
          buyPricePoisha: item.buyPricePoisha || 0,
          subtotalPoisha: item.subtotalPoisha,
        },
      });

      // Create StockMovement (negative quantity for outflow)
      await tx.stockMovement.create({
        data: {
          shopId,
          productId: item.productId,
          quantity: -item.quantity,
          movementType: "SALE",
          referenceType: "SALE",
          referenceId: sale.id,
          note: `বিক্রয় চালান #${invoiceNumber}`,
        },
      });

      // Decrement cached stock on Product and flag for review if stock becomes negative (Phase 3 Rule 6)
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: {
          cachedStock: {
            decrement: item.quantity,
          },
        },
      });

      if (updatedProduct.cachedStock < 0 && !updatedProduct.needsReview) {
        await tx.product.update({
          where: { id: item.productId },
          data: { needsReview: true },
        });
      }
    }

    // 9. Update Customer Balance and Ledger Entry if customer attached
    if (customer) {
      if (totals.duePoisha > 0) {
        const updatedBalance = customer.cachedBalancePoisha + totals.duePoisha;

        // Append to append-only ledger
        await tx.ledgerEntry.create({
          data: {
            shopId,
            customerId: customer.id,
            saleId: sale.id,
            entryType: "SALE",
            debitPoisha: totals.duePoisha,
            creditPoisha: 0,
            balanceAfterPoisha: updatedBalance,
            referenceType: "SALE",
            referenceId: sale.id,
            clientId: clientId ? `${clientId}_ledger` : null,
            description: `বিক্রয় চালান #${invoiceNumber} (বাকি)`,
          },
        });

        // Update cached balance on Customer
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            cachedBalancePoisha: updatedBalance,
          },
        });
      }

      // If customer paid anything at checkout, record Payment
      if (totals.paidPoisha > 0) {
        await tx.payment.create({
          data: {
            shopId,
            clientId: clientId ? `${clientId}_payment` : null,
            customerId: customer.id,
            saleId: sale.id,
            amountPoisha: totals.paidPoisha,
            method: paymentMethod,
            receivedById: userId || null,
            note: `চালান #${invoiceNumber} এ নগদ জমা`,
          },
        });
      }
    }

    // 10. Audit Log
    await logAudit({
      shopId,
      userId,
      action: "CREATE",
      entityType: "Sale",
      entityId: sale.id,
      newValues: {
        invoiceNumber,
        totalPoisha: totals.totalPoisha,
        paidPoisha: totals.paidPoisha,
        duePoisha: totals.duePoisha,
        customerId,
      },
      tx,
    });

    return sale;
  });
}
