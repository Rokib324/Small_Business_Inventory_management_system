import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createSaleTransaction } from "@/features/sales/service";
import { PaymentMethod, LedgerEntryType, LedgerReferenceType } from "@prisma/client";

describe("Phase 1 Core Billing End-to-End Integration Test", () => {
  let shopId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    // 1. Create isolated shop
    const shop = await prisma.shop.create({
      data: {
        name: "E2E Billing Hardware Shop",
        currency: "BDT",
      },
    });
    shopId = shop.id;

    // 2. Create customer with 0 initial balance
    const customer = await prisma.customer.create({
      data: {
        shopId,
        name: "মো: কামরুল হাসান",
        phone: "01799887766",
        cachedBalancePoisha: 0,
      },
    });
    customerId = customer.id;

    // 3. Create product with initial stock 50
    const product = await prisma.product.create({
      data: {
        shopId,
        name: "জিআই পাইপ ৩/৪ ইঞ্চি",
        sku: "GIP-34",
        unit: "PCS",
        buyPricePoisha: 35000,  // ৳350
        sellPricePoisha: 45000, // ৳450
        cachedStock: 50,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    if (shopId) {
      await prisma.shop.delete({ where: { id: shopId } });
    }
    await prisma.$disconnect();
  });

  it("completes full workflow: Sale -> Due Creation -> Stock Outflow -> Ledger Update -> Payment Collection", async () => {
    // Step A: Create Sale (2 units @ ৳450 = ৳900, Discount ৳50, Total ৳850, Paid ৳350, Due ৳500)
    const sale = await createSaleTransaction({
      shopId,
      customerId,
      items: [
        {
          productId,
          quantity: 2,
          unitPricePoisha: 45000,
        },
      ],
      discountPoisha: 5000,
      paidPoisha: 35000,
      paymentMethod: PaymentMethod.CASH,
    });

    expect(sale.id).toBeDefined();
    expect(sale.totalPoisha).toBe(85000);
    expect(sale.paidPoisha).toBe(35000);
    expect(sale.duePoisha).toBe(50000); // ৳500 due

    // Verify Stock was decremented from 50 to 48
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(updatedProduct?.cachedStock).toBe(48);

    // Verify StockMovement recorded
    const stockMovements = await prisma.stockMovement.findMany({
      where: { shopId, productId },
    });
    expect(stockMovements.length).toBe(1);
    expect(stockMovements[0].quantity).toBe(-2);

    // Verify Customer Due Balance updated to 50000 poisha (৳500)
    let customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    expect(customer?.cachedBalancePoisha).toBe(50000);

    // Verify LedgerEntry created for sale due
    let ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { shopId, customerId },
      orderBy: { createdAt: "asc" },
    });
    expect(ledgerEntries.length).toBe(1);
    expect(ledgerEntries[0].entryType).toBe(LedgerEntryType.SALE);
    expect(ledgerEntries[0].debitPoisha).toBe(50000);
    expect(ledgerEntries[0].creditPoisha).toBe(0);
    expect(ledgerEntries[0].balanceAfterPoisha).toBe(50000);

    // Step B: Receive partial payment of ৳300 (30000 poisha)
    const partialPaymentPoisha = 30000;
    const balanceAfterPartial = customer!.cachedBalancePoisha - partialPaymentPoisha; // 20000 poisha (৳200)

    const payment1 = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          shopId,
          customerId,
          amountPoisha: partialPaymentPoisha,
          method: PaymentMethod.CASH,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          shopId,
          customerId,
          entryType: LedgerEntryType.PAYMENT_RECEIVED,
          debitPoisha: 0,
          creditPoisha: partialPaymentPoisha,
          balanceAfterPoisha: balanceAfterPartial,
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: p.id,
          description: "বাকি জমা পরিশোধ (ক্যাশ)",
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { cachedBalancePoisha: balanceAfterPartial },
      });

      return p;
    });

    expect(payment1.id).toBeDefined();

    // Verify Customer Due Balance is now 20000 poisha (৳200)
    customer = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(customer?.cachedBalancePoisha).toBe(20000);

    // Verify Due List Query: customer has due > 0
    const dueCustomers = await prisma.customer.findMany({
      where: { shopId, cachedBalancePoisha: { gt: 0 } },
    });
    expect(dueCustomers.length).toBe(1);
    expect(dueCustomers[0].id).toBe(customerId);
    expect(dueCustomers[0].cachedBalancePoisha).toBe(20000);

    // Step C: Receive final payment of remainder ৳200 (20000 poisha)
    const finalPaymentPoisha = 20000;
    await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          shopId,
          customerId,
          amountPoisha: finalPaymentPoisha,
          method: PaymentMethod.BKASH,
          reference: "TRX-12345",
        },
      });

      await tx.ledgerEntry.create({
        data: {
          shopId,
          customerId,
          entryType: LedgerEntryType.PAYMENT_RECEIVED,
          debitPoisha: 0,
          creditPoisha: finalPaymentPoisha,
          balanceAfterPoisha: 0,
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: p.id,
          description: "বাকি সম্পূর্ণ পরিশোধ (বিকাশ)",
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { cachedBalancePoisha: 0 },
      });
    });

    // Verify Customer balance is now 0
    customer = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(customer?.cachedBalancePoisha).toBe(0);

    // Verify Due List Query: customer no longer in due list
    const dueCustomersAfter = await prisma.customer.findMany({
      where: { shopId, cachedBalancePoisha: { gt: 0 } },
    });
    expect(dueCustomersAfter.length).toBe(0);

    // Verify Complete Append-Only Ledger History
    ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { shopId, customerId },
      orderBy: { createdAt: "asc" },
    });
    expect(ledgerEntries.length).toBe(3);
    // Row 1: Sale due +50000 -> balance 50000
    expect(ledgerEntries[0].debitPoisha).toBe(50000);
    expect(ledgerEntries[0].balanceAfterPoisha).toBe(50000);
    // Row 2: Partial payment -30000 -> balance 20000
    expect(ledgerEntries[1].creditPoisha).toBe(30000);
    expect(ledgerEntries[1].balanceAfterPoisha).toBe(20000);
    // Row 3: Final payment -20000 -> balance 0
    expect(ledgerEntries[2].creditPoisha).toBe(20000);
    expect(ledgerEntries[2].balanceAfterPoisha).toBe(0);
  });
});
