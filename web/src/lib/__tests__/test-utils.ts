import { vi } from "vitest";

// this functions mocks response bodies and status codes for fetch calls, simply place the expected response data in the data parameter
export function mockFetchOnce(data: unknown, ok = true, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  } as Response);
}

// simulates a network failure (offline/DNS), where fetch rejects instead of resolving
export function mockFetchRejects(error?: Error) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(error ?? new Error("Network request failed"));
}
