import { vi } from "vitest";
import type { Transaction } from "@/types/Transaction";
import { mockFetchOnce } from "./test-utils";
import {
  fetchTransactionsById,
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchTransactionsById", () => {
  it("requests transactions for an account", async () => {
    mockFetchOnce(tx1);
    const data = await fetchTransactionsById(1);
    expect(data).toEqual(tx1);
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
