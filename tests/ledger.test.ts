import { describe, it, expect } from "vitest";
import {
  deriveCustomerBalance,
  calculateRunningBalances,
  verifyBalanceIntegrity,
} from "@/features/ledger/utils";

describe("Ledger Balance Calculation (Rule 3 Invariants)", () => {
  it("derives correct balance from debit and credit rows", () => {
    const entries = [
      { debitPoisha: 50000, creditPoisha: 0 }, // Sale on due: +500.00
      { debitPoisha: 25000, creditPoisha: 0 }, // Sale on due: +250.00
      { debitPoisha: 0, creditPoisha: 30000 }, // Payment: -300.00
    ];

    // 50000 + 25000 - 30000 = 45000 poisha (৳450.00 due)
    const balance = deriveCustomerBalance(entries);
    expect(balance).toBe(45000);
  });

  it("handles zero and advance payment (negative balance)", () => {
    const entries = [
      { debitPoisha: 10000, creditPoisha: 0 },
      { debitPoisha: 0, creditPoisha: 15000 }, // Overpaid by 50 Taka
    ];
    const balance = deriveCustomerBalance(entries);
    expect(balance).toBe(-5000); // Customer has 50 Taka advance
  });

  it("calculates sequential running balance correctly for each transaction", () => {
    const entries = [
      { id: "1", debitPoisha: 100000, creditPoisha: 0 }, // +1000 -> 1000
      { id: "2", debitPoisha: 0, creditPoisha: 40000 },  // -400  -> 600
      { id: "3", debitPoisha: 20000, creditPoisha: 0 },  // +200  -> 800
      { id: "4", debitPoisha: 0, creditPoisha: 80000 },  // -800  -> 0
    ];

    const running = calculateRunningBalances(entries);
    expect(running[0].runningBalancePoisha).toBe(100000);
    expect(running[1].runningBalancePoisha).toBe(60000);
    expect(running[2].runningBalancePoisha).toBe(80000);
    expect(running[3].runningBalancePoisha).toBe(0);
  });

  it("verifies balance integrity between cached field and derived ledger entries", () => {
    const entries = [
      { debitPoisha: 10000, creditPoisha: 0 },
      { debitPoisha: 0, creditPoisha: 2000 },
    ];

    // Derived is 8000
    const matched = verifyBalanceIntegrity(8000, entries);
    expect(matched.isValid).toBe(true);
    expect(matched.differencePoisha).toBe(0);

    // Mismatched
    const mismatched = verifyBalanceIntegrity(7500, entries);
    expect(mismatched.isValid).toBe(false);
    expect(mismatched.differencePoisha).toBe(-500);
  });
});
