import { describe, expect, it } from "vitest";
import { signedAmount } from "@/lib/transactions";
import type { Transaction } from "@/types/Transaction";

const base: Transaction = {
  id: 1,
  fromAccountId: null,
  toAccountId: 1,
  amount: 100,
  description: "t",
  date: "2026-08-06",
  type: "DEPOSIT",
};

describe("signedAmount", () => {
  it("returns positive for a deposit into the account", () => {
    expect(signedAmount(base, 1)).toBe(100);
  });

  it("returns negative for a withdrawal from the account", () => {
    expect(
      signedAmount(
        { ...base, type: "WITHDRAW", fromAccountId: 1, toAccountId: null },
        1,
      ),
    ).toBe(-100);
  });

  it("treats transfers as outgoing from the source and incoming to the target", () => {
    const transfer: Transaction = {
      ...base,
      type: "TRANSFER",
      fromAccountId: 1,
      toAccountId: 2,
    };
    expect(signedAmount(transfer, 1)).toBe(-100);
    expect(signedAmount(transfer, 2)).toBe(100);
  });

  it("returns null when the account is not involved", () => {
    expect(
      signedAmount(
        { ...base, type: "TRANSFER", fromAccountId: 3, toAccountId: 4 },
        1,
      ),
    ).toBeNull();
  });
});
