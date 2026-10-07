import { describe, it, expect } from "vitest";
import {
  calculateItemProfit,
  calculateSaleProfit,
  calculateEstimatedProfit,
} from "@/features/reports/profit";

describe("Profit Calculation Tests (Phase 2 Rule)", () => {
  describe("calculateItemProfit", () => {
    it("correctly computes item profit based on snapshot sell and buy prices in integer poisha", () => {
      // 5 units sold at ৳500 (50000 poisha), bought at ৳380 (38000 poisha)
      // Profit per unit = ৳120 = 12000 poisha
      // Total item profit = 5 * 12000 = 60000 poisha (৳600)
      const profit = calculateItemProfit({
        quantity: 5,
        unitPricePoisha: 50000,
        buyPricePoisha: 38000,
      });

      expect(profit).toBe(60000);
    });

    it("handles zero or negative margin gracefully", () => {
      // Sold at cost price -> profit 0
      const breakEven = calculateItemProfit({
        quantity: 10,
        unitPricePoisha: 20000,
        buyPricePoisha: 20000,
      });
      expect(breakEven).toBe(0);

      // Sold at loss -> negative profit
      const loss = calculateItemProfit({
        quantity: 2,
        unitPricePoisha: 15000,
        buyPricePoisha: 18000,
      });
      expect(loss).toBe(-6000);
    });
  });

  describe("calculateSaleProfit", () => {
    it("deducts sale discount from gross profit to obtain net profit", () => {
      const sale = {
        items: [
          {
            quantity: 2,
            unitPricePoisha: 100000, // 2 * ৳1000 = ৳2000
            buyPricePoisha: 80000,   // 2 * ৳800  = ৳1600 -> Gross = ৳400 (40000 poisha)
          },
          {
            quantity: 4,
            unitPricePoisha: 25000,  // 4 * ৳250  = ৳1000
            buyPricePoisha: 20000,   // 4 * ৳200  = ৳800  -> Gross = ৳200 (20000 poisha)
          },
        ],
        // Total Gross Profit = 40000 + 20000 = 60000 poisha (৳600)
        // Discount given = ৳50 = 5000 poisha
        // Net Profit = ৳550 = 55000 poisha
        discountPoisha: 5000,
      };

      const res = calculateSaleProfit(sale);
      expect(res.grossProfitPoisha).toBe(60000);
      expect(res.discountPoisha).toBe(5000);
      expect(res.netProfitPoisha).toBe(55000);
    });
  });

  describe("calculateEstimatedProfit", () => {
    it("aggregates profit across multiple sales", () => {
      const sales = [
        {
          items: [
            {
              quantity: 1,
              unitPricePoisha: 50000,
              buyPricePoisha: 40000, // profit 10000
            },
          ],
          discountPoisha: 0,
        },
        {
          items: [
            {
              quantity: 2,
              unitPricePoisha: 30000,
              buyPricePoisha: 20000, // profit 20000
            },
          ],
          discountPoisha: 2000, // net 18000
        },
      ];

      const res = calculateEstimatedProfit(sales);
      expect(res.totalGrossProfitPoisha).toBe(30000);
      expect(res.totalDiscountPoisha).toBe(2000);
      expect(res.totalNetProfitPoisha).toBe(28000);
    });
  });
});
