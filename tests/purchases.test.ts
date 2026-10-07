import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  calculatePurchaseTotals,
  createPurchaseTransaction,
} from "@/features/purchases/service";

describe("Purchase Domain Tests (Phase 2 & Rule 5 Invariants)", () => {
  describe("calculatePurchaseTotals", () => {
    it("correctly computes subtotals, totals, paid amounts and dues in integer poisha", () => {
      const items = [
        {
          quantity: 10,
          buyPricePoisha: 35000, // 10 * ৳350 = ৳3,500 = 350,000 poisha
        },
        {
          quantity: 2,
          buyPricePoisha: 120000, // 2 * ৳1,200 = ৳2,400 = 240,000 poisha
        },
      ];

      // Total = 350,000 + 240,000 = 590,000 poisha (৳5,900)
      // Paid now = 200,000 poisha (৳2,000)
      // Due = 390,000 poisha (৳3,900)
      const res = calculatePurchaseTotals(items, 200000);

      expect(res.subtotalPoisha).toBe(590000);
      expect(res.totalPoisha).toBe(590000);
      expect(res.paidPoisha).toBe(200000);
      expect(res.duePoisha).toBe(390000);
    });

    it("caps paid amount at total purchase amount", () => {
      const items = [
        {
          quantity: 1,
          buyPricePoisha: 5000,
        },
      ];
      const res = calculatePurchaseTotals(items, 10000);
      expect(res.totalPoisha).toBe(5000);
      expect(res.paidPoisha).toBe(5000);
      expect(res.duePoisha).toBe(0);
    });
  });

  describe("createPurchaseTransaction Database Integration", () => {
    let testShopId: string;
    let testProductId1: string;
    let testProductId2: string;
    let testSupplierId: string;

    beforeAll(async () => {
      const shop = await prisma.shop.create({
        data: {
          name: "Purchase Test Hardware",
        },
      });
      testShopId = shop.id;

      const supplier = await prisma.supplier.create({
        data: {
          shopId: testShopId,
          name: "আমান উল্লাহ মহাজন",
          companyName: "আমান এন্টারপ্রাইজ",
          phone: "01722000000",
          cachedBalancePoisha: 50000, // Existing due: ৳500
        },
      });
      testSupplierId = supplier.id;

      const p1 = await prisma.product.create({
        data: {
          shopId: testShopId,
          name: "১ ইঞ্চি পিভিসি পাইপ",
          unit: "PCS",
          buyPricePoisha: 30000, // ৳300
          sellPricePoisha: 40000,
          cachedStock: 20,
        },
      });
      testProductId1 = p1.id;

      const p2 = await prisma.product.create({
        data: {
          shopId: testShopId,
          name: "সিমেন্ট বসুন্ধরা",
          unit: "BAG",
          buyPricePoisha: 45000, // ৳450
          sellPricePoisha: 52000,
          cachedStock: 15,
        },
      });
      testProductId2 = p2.id;
    });

    afterAll(async () => {
      if (testShopId) {
        await prisma.shop.delete({
          where: { id: testShopId },
        });
      }
      await prisma.$disconnect();
    });

    it("atomically creates purchase, items, stock movements, increments stock, and updates supplier ledger", async () => {
      // Buy 10 pipes at ৳320 (32000 poisha) + 5 cement bags at ৳460 (46000 poisha)
      // Total = (10 * 32000) + (5 * 46000) = 320,000 + 230,000 = 550,000 poisha (৳5,500)
      // Paid = ৳2,000 = 200,000 poisha
      // Due remainder = ৳3,500 = 350,000 poisha
      const purchase = await createPurchaseTransaction({
        shopId: testShopId,
        supplierId: testSupplierId,
        invoiceNumber: "PUR-TEST-1001",
        items: [
          {
            productId: testProductId1,
            quantity: 10,
            buyPricePoisha: 32000,
          },
          {
            productId: testProductId2,
            quantity: 5,
            buyPricePoisha: 46000,
          },
        ],
        paidPoisha: 200000,
      });

      expect(purchase).toBeDefined();
      expect(purchase?.totalPoisha).toBe(550000);
      expect(purchase?.paidPoisha).toBe(200000);
      expect(purchase?.duePoisha).toBe(350000);

      // 1. Verify products stock incremented and buy price updated
      const updatedP1 = await prisma.product.findUnique({
        where: { id: testProductId1 },
      });
      expect(updatedP1?.cachedStock).toBe(30); // 20 + 10 = 30
      expect(updatedP1?.buyPricePoisha).toBe(32000);

      const updatedP2 = await prisma.product.findUnique({
        where: { id: testProductId2 },
      });
      expect(updatedP2?.cachedStock).toBe(20); // 15 + 5 = 20
      expect(updatedP2?.buyPricePoisha).toBe(46000);

      // 2. Verify stock movements recorded as positive quantity (inflow)
      const movements = await prisma.stockMovement.findMany({
        where: { shopId: testShopId, referenceId: purchase?.id },
      });
      expect(movements.length).toBe(2);
      expect(movements.every((m) => m.quantity > 0)).toBe(true);
      expect(movements[0].movementType).toBe("PURCHASE");

      // 3. Verify supplier balance updated
      const updatedSupplier = await prisma.supplier.findUnique({
        where: { id: testSupplierId },
      });
      // Initial: 50,000 + Due added: 350,000 = 400,000 poisha
      expect(updatedSupplier?.cachedBalancePoisha).toBe(400000);

      // 4. Verify supplier ledger entry recorded
      const ledgerEntry = await prisma.ledgerEntry.findFirst({
        where: { shopId: testShopId, purchaseId: purchase?.id },
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry?.entryType).toBe("SUPPLIER_PURCHASE");
      expect(ledgerEntry?.creditPoisha).toBe(350000);
      expect(ledgerEntry?.balanceAfterPoisha).toBe(400000);

      // 5. Verify audit log created
      const audit = await prisma.auditLog.findFirst({
        where: { shopId: testShopId, entityId: purchase?.id },
      });
      expect(audit).toBeDefined();
      expect(audit?.action).toBe("CREATE");
      expect(audit?.entityType).toBe("Purchase");
    });

    it("rejects credit purchase when no supplier is specified", async () => {
      await expect(
        createPurchaseTransaction({
          shopId: testShopId,
          supplierId: null, // No supplier
          items: [
            {
              productId: testProductId1,
              quantity: 5,
              buyPricePoisha: 30000,
            },
          ],
          paidPoisha: 0, // Unpaid -> due > 0
        })
      ).rejects.toThrow();
    });
  });
});
