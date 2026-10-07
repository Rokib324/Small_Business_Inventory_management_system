/**
 * Baki (বাকি) - Sale Calculation & Formatting Utilities
 * Enforces integer poisha math for sales, items, discounts, and dues.
 */

export interface CartItemInput {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPricePoisha: number;
  buyPricePoisha?: number;
}

export interface SaleTotalsResult {
  items: Array<CartItemInput & { subtotalPoisha: number }>;
  subtotalPoisha: number;
  discountPoisha: number;
  totalPoisha: number;
  paidPoisha: number;
  duePoisha: number;
}

/**
 * Calculates sale line items, subtotal, discount, total, paid now, and remaining due.
 * Everything strictly in integer poisha.
 */
export function calculateSaleTotals(
  items: CartItemInput[],
  discountPoishaInput: number = 0,
  paidPoishaInput: number = 0
): SaleTotalsResult {
  let subtotalPoisha = 0;

  const calculatedItems = items.map((item) => {
    const qty = Math.max(0, Math.floor(item.quantity));
    const price = Math.max(0, Math.floor(item.unitPricePoisha));
    const lineSubtotal = qty * price;
    subtotalPoisha += lineSubtotal;

    return {
      ...item,
      quantity: qty,
      unitPricePoisha: price,
      subtotalPoisha: lineSubtotal,
    };
  });

  const discountPoisha = Math.min(
    subtotalPoisha,
    Math.max(0, Math.floor(discountPoishaInput))
  );

  const totalPoisha = Math.max(0, subtotalPoisha - discountPoisha);

  // Paid amount cannot exceed total
  const paidPoisha = Math.min(
    totalPoisha,
    Math.max(0, Math.floor(paidPoishaInput))
  );

  const duePoisha = Math.max(0, totalPoisha - paidPoisha);

  return {
    items: calculatedItems,
    subtotalPoisha,
    discountPoisha,
    totalPoisha,
    paidPoisha,
    duePoisha,
  };
}

/**
 * Generates an invoice number given a sequence number and year.
 * Example: generateInvoiceNumber(12, 2026) -> "INV-2026-0012"
 */
export function generateInvoiceNumber(
  seq: number,
  year: number = new Date().getFullYear()
): string {
  const padded = String(seq).padStart(4, "0");
  return `INV-${year}-${padded}`;
}
