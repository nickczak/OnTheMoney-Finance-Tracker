import { vi } from "vitest";
import type { Transaction } from "@/types/Transaction";
import { mockFetchOnce, mockFetchRejects } from "./test-utils";
import {
  fetchTransactions,
  fetchTransactionsById,
  fetchTransactionsByDateRange,
  postTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/api";

const tx1: Transaction = {
  id: 1,
  fromAccountId: null,
  toAccountId: 1,
  amount: 100,
  description: "test",
  date: "2026-01-01",
  type: "DEPOSIT",
};
const tx2: Transaction = {
  id: 2,
  fromAccountId: 2,
  toAccountId: null,
  amount: 100,
  description: "test",
  date: "2026-02-01",
  type: "WITHDRAW",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchTransactions", () => {
  it("returns transactions on success", async () => {
    mockFetchOnce([tx1, tx2]);

    const data = await fetchTransactions();
    expect(data).toEqual([tx1, tx2]);
  });

  it("rejects on network failure", async () => {
    mockFetchRejects();
    await expect(fetchTransactions()).rejects.toThrow("Network request failed");
  });
});

describe("fetchTransactionsById", () => {
  it("requests transactions for an account", async () => {
    mockFetchOnce(tx1);
    const data = await fetchTransactionsById(1);
    expect(data).toEqual(tx1);
  });
});

describe("fetchTransactionsByDateRange", () => {
  it("requests transactions in a date range", async () => {
    mockFetchOnce([tx1, tx2]);
    const data = await fetchTransactionsByDateRange("2026-01-01", "2026-02-31");
    expect(data).toEqual([tx1, tx2]);
  });
});

describe("postTransaction", () => {
  it("POSTs a deposit to the account endpoint", async () => {
    const spy = mockFetchOnce({
      id: 5,
      fromAccountId: null,
      toAccountId: 1,
      amount: 100,
      description: "test",
      date: "2026-01-01",
      type: "DEPOSIT",
    });
    const result = await postTransaction(1, {
      type: "DEPOSIT",
      fromAccountId: null,
      toAccountId: 1,
      amount: 100,
      description: "test",
      date: "2026-01-01",
    });
    expect(result).toEqual({
      id: 5,
      fromAccountId: null,
      toAccountId: 1,
      amount: 100,
      description: "test",
      date: "2026-01-01",
      type: "DEPOSIT",
    });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/accounts/1/deposit");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({
        amount: 100,
        description: "test",
        date: "2026-01-01",
      }),
    );
  });
  it("POSTs a withdrawal to the account endpoint", async () => {
    const spy = mockFetchOnce({
      id: 6,
      fromAccountId: 1,
      toAccountId: null,
      amount: 50,
      description: "test",
      date: "2026-01-01",
      type: "WITHDRAW",
    });
    const result = await postTransaction(1, {
      type: "WITHDRAW",
      fromAccountId: 1,
      toAccountId: null,
      amount: 50,
      description: "test",
      date: "2026-01-01",
    });
    expect(result).toEqual({
      id: 6,
      fromAccountId: 1,
      toAccountId: null,
      amount: 50,
      description: "test",
      date: "2026-01-01",
      type: "WITHDRAW",
    });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/accounts/1/withdraw");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({
        amount: 50,
        description: "test",
        date: "2026-01-01",
      }),
    );
  });
  it("POSTs a transfer to the transfer endpoint", async () => {
    const spy = mockFetchOnce({
      id: 7,
      fromAccountId: 2,
      toAccountId: 1,
      amount: 200,
      description: "moved to savings",
      date: "2026-01-01",
      type: "TRANSFER",
    });
    const result = await postTransaction(1, {
      type: "TRANSFER",
      fromAccountId: 2,
      toAccountId: 1,
      amount: 200,
      description: "moved to savings",
      date: "2026-01-01",
    });
    expect(result).toEqual({
      id: 7,
      fromAccountId: 2,
      toAccountId: 1,
      amount: 200,
      description: "moved to savings",
      date: "2026-01-01",
      type: "TRANSFER",
    });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/transfers");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({
        amount: 200,
        description: "moved to savings",
        date: "2026-01-01",
        fromAccountId: 2,
        toAccountId: 1,
      }),
    );
  });
});

describe("updateTransaction", () => {
  it("PUTs the updated fields to the transaction endpoint", async () => {
    const spy = mockFetchOnce({ ...tx1, amount: 250 });
    const result = await updateTransaction(1, { amount: 250 });
    expect(result).toEqual({ ...tx1, amount: 250 });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/transactions/1");
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe(JSON.stringify({ amount: 250 }));
  });

  it("omits fields that were not provided", async () => {
    const spy = mockFetchOnce({ ...tx1, amount: 250 });
    await updateTransaction(1, { amount: 250 });
    const [, init] = spy.mock.calls[0];
    expect(init?.body).toBe(JSON.stringify({ amount: 250 }));
  });

  it("includes the description in the JSON body", async () => {
    const spy = mockFetchOnce({ ...tx1, description: "rent & utilities" });
    await updateTransaction(1, { description: "rent & utilities" });
    const [, init] = spy.mock.calls[0];
    expect(init?.body).toBe(
      JSON.stringify({ description: "rent & utilities" }),
    );
  });

  it("throws on HTTP error", async () => {
    mockFetchOnce(null, false, 404);
    await expect(updateTransaction(1, { amount: 250 })).rejects.toThrow(
      "HTTP 404",
    );
  });
});

describe("deleteTransaction", () => {
  it("DELETEs the transaction by id", async () => {
    const spy = mockFetchOnce(null);
    await deleteTransaction(3);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/transactions/3"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws on HTTP error", async () => {
    mockFetchOnce(null, false, 404);
    await expect(deleteTransaction(3)).rejects.toThrow("HTTP 404");
  });
});
