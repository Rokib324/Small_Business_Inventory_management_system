import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { calculateSaleTotals } from "@/features/sales/utils";
import { createSaleTransaction } from "@/features/sales/service";

describe("Sale Domain Tests (Rule 5 Atomic Transactions)", () => {
  describe("calculateSaleTotals", () => {
    it("correctly computes subtotals, discounts, paid amounts and dues in integer poisha", () => {
      const items = [
        {
          productId: "p1",
          productName: "GI Pipe",
          unit: "PCS",
          quantity: 2,
          unitPricePoisha: 50000, // ৳500 each
        },
        {
          productId: "p2",
          productName: "Cement Bag",
          unit: "BAG",
          quantity: 5,
          unitPricePoisha: 45000, // ৳450 each
        },
      ];

      // Subtotal = (2 * 500) + (5 * 450) = 1000 + 2250 = 3250 Taka = 325000 poisha
      // Discount = 50 Taka = 5000 poisha -> Total = 320000 poisha (৳3200)
      // Paid now = 2000 Taka = 200000 poisha -> Due = 120000 poisha (৳1200)
      const result = calculateSaleTotals(items, 5000, 200000);

      expect(result.subtotalPoisha).toBe(325000);
      expect(result.discountPoisha).toBe(5000);
      expect(result.totalPoisha).toBe(320000);
      expect(result.paidPoisha).toBe(200000);
      expect(result.duePoisha).toBe(120000);
      expect(result.items[0].subtotalPoisha).toBe(100000);
      expect(result.items[1].subtotalPoisha).toBe(225000);
    });

    it("prevents negative totals or paid exceeding total", () => {
      const items = [
        {
          productId: "p1",
          productName: "Tape",
          unit: "PCS",
          quantity: 1,
          unitPricePoisha: 10000, // ৳100
        },
      ];

      // Discount exceeds subtotal -> total should be 0
      const res1 = calculateSaleTotals(items, 20000, 0);
      expect(res1.totalPoisha).toBe(0);
      expect(res1.duePoisha).toBe(0);

      // Paid exceeds total -> capped at total
      const res2 = calculateSaleTotals(items, 0, 15000);
      expect(res2.totalPoisha).toBe(10000);
      expect(res2.paidPoisha).toBe(10000);
      expect(res2.duePoisha).toBe(0);
    });
  });

  describe("createSaleTransaction Database Integration", () => {
    let testShopId: string;
    let testProductId: string;
    let testCustomerId: string;

    beforeAll(async () => {
      // Create isolated test shop
      const shop = await prisma.shop.create({
        data: {
          name: "Test Hardware Store",
        },
      });
      testShopId = shop.id;

      // Create test product with 50 units initial stock
      const product = await prisma.product.create({
        data: {
          shopId: testShopId,
          name: "১/২ ইঞ্চি জিআই পাইপ",
          unit: "PCS",
          buyPricePoisha: 40000,
          sellPricePoisha: 50000,
          cachedStock: 50,
        },
      });
      testProductId = product.id;

      // Create test customer with 0 initial balance
      const customer = await prisma.customer.create({
        data: {
          shopId: testShopId,
          name: "করিম মিয়া",
          phone: "01800000000",
          cachedBalancePoisha: 0,
        },
      });
      testCustomerId = customer.id;
    });

    afterAll(async () => {
      // Clean up test shop and cascade relations
      if (testShopId) {
        await prisma.shop.delete({
          where: { id: testShopId },
        });
      }
      await prisma.$disconnect();
    });

    it("atomically creates sale, stock movement, decrements stock, updates customer balance and writes ledger", async () => {
      const sale = await createSaleTransaction({
        shopId: testShopId,
        customerId: testCustomerId,
        invoiceNumber: "INV-TEST-001",
        items: [
          {
            productId: testProductId,
            quantity: 3,
            unitPricePoisha: 50000, // 3 * ৳500 = ৳1500 = 150000 poisha
          },
        ],
        discountPoisha: 10000, // ৳100 discount -> total ৳1400 = 140000 poisha
        paidPoisha: 40000,     // ৳400 paid now
        // Due remainder = ৳1000 = 100000 poisha
      });

      expect(sale.id).toBeDefined();
      expect(sale.subtotalPoisha).toBe(150000);
      expect(sale.discountPoisha).toBe(10000);
      expect(sale.totalPoisha).toBe(140000);
      expect(sale.paidPoisha).toBe(40000);
      expect(sale.duePoisha).toBe(100000);

      // Verify product stock was decremented from 50 to 47
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(updatedProduct?.cachedStock).toBe(47);

      // Verify stock movement created
      const movements = await prisma.stockMovement.findMany({
        where: { shopId: testShopId, productId: testProductId },
      });
      expect(movements.length).toBe(1);
      expect(movements[0].quantity).toBe(-3);
      expect(movements[0].movementType).toBe("SALE");

      // Verify customer cached balance increased by due (100000 poisha)
      const updatedCustomer = await prisma.customer.findUnique({
        where: { id: testCustomerId },
      });
      expect(updatedCustomer?.cachedBalancePoisha).toBe(100000);

      // Verify ledger entry created
      const ledgerEntries = await prisma.ledgerEntry.findMany({
        where: { shopId: testShopId, customerId: testCustomerId },
      });
      expect(ledgerEntries.length).toBe(1);
      expect(ledgerEntries[0].debitPoisha).toBe(100000);
      expect(ledgerEntries[0].balanceAfterPoisha).toBe(100000);

      // Verify payment entry created for paid amount (40000 poisha)
      const payments = await prisma.payment.findMany({
        where: { shopId: testShopId, customerId: testCustomerId },
      });
      expect(payments.length).toBe(1);
      expect(payments[0].amountPoisha).toBe(40000);

      // Verify audit log created
      const audit = await prisma.auditLog.findFirst({
        where: { shopId: testShopId, entityId: sale.id },
      });
      expect(audit).toBeDefined();
      expect(audit?.action).toBe("CREATE");
    });

    it("rejects a sale with due amount if no customer is selected", async () => {
      await expect(
        createSaleTransaction({
          shopId: testShopId,
          customerId: null, // Walk-in customer
          items: [
            {
              productId: testProductId,
              quantity: 1,
            },
          ],
          paidPoisha: 0, // Unpaid -> due > 0
        })
      ).rejects.toThrow();
    });
  });
});
