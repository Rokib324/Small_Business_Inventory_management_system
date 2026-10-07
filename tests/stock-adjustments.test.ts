import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  calculateRunningStock,
  adjustStockTransaction,
} from "@/features/products/stock-service";

describe("Stock Adjustments & Movements (Phase 2 Rule)", () => {
  describe("calculateRunningStock", () => {
    it("correctly computes chronological running stock", () => {
      const movements = [
        { id: "1", quantity: 50 },  // Initial stock / Purchase: 50
        { id: "2", quantity: -10 }, // Sale: 40
        { id: "3", quantity: -2 },  // Damage: 38
        { id: "4", quantity: 20 },  // Purchase: 58
        { id: "5", quantity: -5 },  // Sale: 53
      ];

      const running = calculateRunningStock(movements, 0);
      expect(running[0].runningStock).toBe(50);
      expect(running[1].runningStock).toBe(40);
      expect(running[2].runningStock).toBe(38);
      expect(running[3].runningStock).toBe(58);
      expect(running[4].runningStock).toBe(53);
    });
  });

  describe("adjustStockTransaction Database Integration", () => {
    let testShopId: string;
    let testProductId: string;

    beforeAll(async () => {
      const shop = await prisma.shop.create({
        data: {
          name: "Stock Test Store",
        },
      });
      testShopId = shop.id;

      const product = await prisma.product.create({
        data: {
          shopId: testShopId,
          name: "রড ১০ মিমি",
          unit: "KG",
          buyPricePoisha: 9000,
          sellPricePoisha: 10000,
          cachedStock: 25,
        },
      });
      testProductId = product.id;
    });

    afterAll(async () => {
      if (testShopId) {
        await prisma.shop.delete({
          where: { id: testShopId },
        });
      }
      await prisma.$disconnect();
    });

    it("decrements stock, writes StockMovement with DAMAGE type, and logs audit", async () => {
      const result = await adjustStockTransaction({
        shopId: testShopId,
        productId: testProductId,
        adjustmentType: "DECREASE",
        quantity: 5,
        reason: "DAMAGE",
        note: "বৃষ্টিতে ভিজে জং ধরা",
      });

      expect(result.product.cachedStock).toBe(20); // 25 - 5 = 20
      expect(result.movement.quantity).toBe(-5);
      expect(result.movement.movementType).toBe("DAMAGE");

      // Verify DB product state
      const dbProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(dbProduct?.cachedStock).toBe(20);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: { shopId: testShopId, entityId: testProductId },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeDefined();
      expect(audit?.action).toBe("UPDATE");
      expect((audit?.newValues as Record<string, unknown>)?.cachedStock).toBe(20);
    });

    it("increments stock, writes StockMovement with ADJUSTMENT type for count correction", async () => {
      const result = await adjustStockTransaction({
        shopId: testShopId,
        productId: testProductId,
        adjustmentType: "INCREASE",
        quantity: 10,
        reason: "COUNT_CORRECTION",
        note: "ভুল গোনা সংশোধন",
      });

      expect(result.product.cachedStock).toBe(30); // 20 + 10 = 30
      expect(result.movement.quantity).toBe(10);
      expect(result.movement.movementType).toBe("ADJUSTMENT");

      const dbProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(dbProduct?.cachedStock).toBe(30);
    });

    it("rejects decrease that exceeds current cached stock", async () => {
      // Current stock is 30, attempting to decrease 50
      await expect(
        adjustStockTransaction({
          shopId: testShopId,
          productId: testProductId,
          adjustmentType: "DECREASE",
          quantity: 50,
          reason: "DAMAGE",
        })
      ).rejects.toThrow(/ঋণাত্মক হতে পারে না/);
    });
  });
});
