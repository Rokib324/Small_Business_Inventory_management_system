import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { runReconciliation } from "../scripts/reconcile-integrity";

describe("Integrity Reconciliation Script (Phase 2 Rule)", () => {
  let testShopId: string;
  let testCustomerId: string;
  let testProductId: string;

  beforeAll(async () => {
    const shop = await prisma.shop.create({
      data: { name: "Reconcile Test Store" },
    });
    testShopId = shop.id;

    // Customer with 100 Taka (10000 poisha) due and matching ledger entry
    const customer = await prisma.customer.create({
      data: {
        shopId: testShopId,
        name: "রফিক সাহেব",
        cachedBalancePoisha: 10000,
      },
    });
    testCustomerId = customer.id;

    await prisma.ledgerEntry.create({
      data: {
        shopId: testShopId,
        customerId: testCustomerId,
        entryType: "OPENING_BALANCE",
        debitPoisha: 10000,
        balanceAfterPoisha: 10000,
        description: "প্রারম্ভিক বাকি",
      },
    });

    // Product with 15 units stock and matching movement
    const product = await prisma.product.create({
      data: {
        shopId: testShopId,
        name: "প্লাস্টিক ড্রাম",
        unit: "PCS",
        buyPricePoisha: 80000,
        sellPricePoisha: 95000,
        cachedStock: 15,
      },
    });
    testProductId = product.id;

    await prisma.stockMovement.create({
      data: {
        shopId: testShopId,
        productId: testProductId,
        quantity: 15,
        movementType: "ADJUSTMENT",
        note: "প্রারম্ভিক স্টক",
      },
    });
  });

  afterAll(async () => {
    if (testShopId) {
      await prisma.shop.delete({ where: { id: testShopId } });
    }
    await prisma.$disconnect();
  });

  it("passes when cached values perfectly match ledger entries and movements", async () => {
    const res = await runReconciliation(false, testShopId);
    expect(res.success).toBe(true);
    expect(res.totalMismatches).toBe(0);
  });

  it("detects deliberate mismatch when cached balance drifts, and repairs it with autoFix", async () => {
    // Deliberately cause mismatch: modify cachedBalancePoisha to 15000 (ledger has 10000)
    await prisma.customer.update({
      where: { id: testCustomerId },
      data: { cachedBalancePoisha: 15000 },
    });

    // 1. Without fix: detects mismatch
    const check1 = await runReconciliation(false, testShopId);
    expect(check1.success).toBe(false);
    expect(check1.totalMismatches).toBe(1);

    // 2. With autoFix: repairs mismatch
    const check2 = await runReconciliation(true, testShopId);
    expect(check2.success).toBe(true);
    expect(check2.totalMismatches).toBe(1);

    // 3. Verify in DB that customer cached balance was healed back to 10000
    const healedCustomer = await prisma.customer.findUnique({
      where: { id: testCustomerId },
    });
    expect(healedCustomer?.cachedBalancePoisha).toBe(10000);
  });
});
