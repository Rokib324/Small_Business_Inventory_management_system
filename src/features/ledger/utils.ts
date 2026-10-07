/**
 * Baki (বাকি) - Ledger Balance Calculation Utilities
 * Rule 3: Customer balance is derived from LedgerEntry rows.
 * Balance = sum(debit) - sum(credit).
 * Positive balance = Due owed by customer to the shop.
 * Negative balance = Advance paid by customer.
 */

export interface LedgerEntryLike {
  debitPoisha: number;
  creditPoisha: number;
}

/**
 * Derives the total customer balance from an array of ledger entries.
 * Positive = Customer has outstanding due.
 * Zero = Fully settled.
 * Negative = Customer has advance credit.
 */
export function deriveCustomerBalance(entries: LedgerEntryLike[]): number {
  return entries.reduce((acc, entry) => {
    return acc + (entry.debitPoisha || 0) - (entry.creditPoisha || 0);
  }, 0);
}

/**
 * Calculates chronological running balance for ledger statement display.
 * Assumes entries are sorted chronologically ascending.
 */
export function calculateRunningBalances<T extends LedgerEntryLike>(
  entries: T[],
  startingBalancePoisha: number = 0
): Array<T & { runningBalancePoisha: number }> {
  let running = startingBalancePoisha;

  return entries.map((entry) => {
    running = running + (entry.debitPoisha || 0) - (entry.creditPoisha || 0);
    return {
      ...entry,
      runningBalancePoisha: running,
    };
  });
}

/**
 * Verifies whether the cached balance matches the derived balance from all ledger entries.
 */
export function verifyBalanceIntegrity(
  cachedBalancePoisha: number,
  entries: LedgerEntryLike[]
): {
  isValid: boolean;
  derivedBalancePoisha: number;
  differencePoisha: number;
} {
  const derived = deriveCustomerBalance(entries);
  const diff = cachedBalancePoisha - derived;
  return {
    isValid: diff === 0,
    derivedBalancePoisha: derived,
    differencePoisha: diff,
  };
}
