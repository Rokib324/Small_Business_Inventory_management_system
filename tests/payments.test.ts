import { describe, it, expect } from "vitest";
import { receivePaymentSchema } from "@/features/payments/schemas";
import { PaymentMethod } from "@prisma/client";
import { toPoisha, fromPoisha } from "@/lib/money";

describe("Payment Collection Validation & Math", () => {
  it("validates valid payment collection input", () => {
    const valid = {
      customerId: "cust-123",
      amountTaka: 500,
      method: PaymentMethod.CASH,
      reference: "TRX-987",
      note: "ক্যাশ জমা",
    };

    const result = receivePaymentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toPoisha(result.data.amountTaka)).toBe(50000);
      expect(fromPoisha(toPoisha(result.data.amountTaka))).toBe(500);
    }
  });

  it("rejects zero or negative payment amount", () => {
    const invalidZero = {
      customerId: "cust-123",
      amountTaka: 0,
      method: PaymentMethod.CASH,
    };
    expect(receivePaymentSchema.safeParse(invalidZero).success).toBe(false);

    const invalidNegative = {
      customerId: "cust-123",
      amountTaka: -100,
      method: PaymentMethod.CASH,
    };
    expect(receivePaymentSchema.safeParse(invalidNegative).success).toBe(false);
  });

  it("calculates customer balance decrement accurately", () => {
    const startingDuePoisha = 1250000; // ৳12,500
    const paymentAmountTaka = 2500;    // ৳2,500
    const paymentAmountPoisha = toPoisha(paymentAmountTaka); // 250000

    const updatedBalancePoisha = startingDuePoisha - paymentAmountPoisha;
    expect(updatedBalancePoisha).toBe(1000000); // ৳10,000 remaining due
  });
});
