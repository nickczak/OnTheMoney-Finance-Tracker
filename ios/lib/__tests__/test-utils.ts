// mock fetch to return parameterized response with given data
export function mockFetchOnce(data: unknown, ok = true, status = 200) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  } as Response);
}
