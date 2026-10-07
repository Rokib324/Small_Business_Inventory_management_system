/**
 * Profit Calculation Utilities (Phase 2 Rule)
 * Store buy price on SaleItem at sale time so profit stays correct if prices change later.
 * Estimated profit = sum(quantity * (sellPricePoisha - buyPricePoisha)) - discountPoisha.
 */

export interface ProfitItemInput {
  quantity: number;
  unitPricePoisha: number;
  buyPricePoisha: number;
}

export interface SaleProfitInput {
  items: ProfitItemInput[];
  discountPoisha?: number;
}

/**
 * Calculates gross profit for a single line item
 */
export function calculateItemProfit(item: ProfitItemInput): number {
  const revenue = Math.max(0, item.quantity) * Math.max(0, item.unitPricePoisha);
  const cost = Math.max(0, item.quantity) * Math.max(0, item.buyPricePoisha);
  return revenue - cost;
}

/**
 * Calculates profit for a single sale including discount
 */
export function calculateSaleProfit(sale: SaleProfitInput): {
  grossProfitPoisha: number;
  discountPoisha: number;
  netProfitPoisha: number;
} {
  const grossProfitPoisha = sale.items.reduce(
    (sum, item) => sum + calculateItemProfit(item),
    0
  );
  const discountPoisha = Math.max(0, sale.discountPoisha || 0);
  const netProfitPoisha = grossProfitPoisha - discountPoisha;

  return {
    grossProfitPoisha,
    discountPoisha,
    netProfitPoisha,
  };
}

/**
 * Calculates aggregate estimated profit across multiple sales
 */
export function calculateEstimatedProfit(sales: SaleProfitInput[]): {
  totalGrossProfitPoisha: number;
  totalDiscountPoisha: number;
  totalNetProfitPoisha: number;
} {
  return sales.reduce(
    (acc, sale) => {
      const res = calculateSaleProfit(sale);
      return {
        totalGrossProfitPoisha: acc.totalGrossProfitPoisha + res.grossProfitPoisha,
        totalDiscountPoisha: acc.totalDiscountPoisha + res.discountPoisha,
        totalNetProfitPoisha: acc.totalNetProfitPoisha + res.netProfitPoisha,
      };
    },
    {
      totalGrossProfitPoisha: 0,
      totalDiscountPoisha: 0,
      totalNetProfitPoisha: 0,
    }
  );
}
