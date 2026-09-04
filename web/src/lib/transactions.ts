import type { Transaction } from "@/types/Transaction";

/**
 * Determines how a transaction affects a specific account's balance and
 * returns the signed delta (money moving into the account is positive).
 * Returns null when the transaction doesn't touch the account.
 */
export function signedAmount(
  transaction: Transaction,
  accountId: number,
): number | null {
  if (transaction.type === "DEPOSIT") return transaction.amount;
  if (transaction.type === "WITHDRAW") return -transaction.amount;
  if (transaction.type === "TRANSFER") {
    if (transaction.fromAccountId === accountId) return -transaction.amount;
    if (transaction.toAccountId === accountId) return transaction.amount;
  }
  return null;
}
