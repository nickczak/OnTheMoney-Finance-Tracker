import { mockFetchOnce, mockFetchRejects } from './test-utils';
import { fetchCreditScore, setCreditScore } from '../api';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchCreditScore', () => {
  it('returns credit score on success', async () => {
    mockFetchOnce({ score: 750 });
    const data = await fetchCreditScore();
    expect(data).toBe(750);
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 500);
    await expect(fetchCreditScore()).rejects.toThrow('HTTP 500');
  });

  it('rejects on network failure', async () => {
    mockFetchRejects();
    await expect(fetchCreditScore()).rejects.toThrow('Network request failed');
  });
});

describe('setCreditScore', () => {
  it('POSTs a new credit score', async () => {
    const spy = mockFetchOnce(null);
    await setCreditScore(800);
    const [url, options] = spy.mock.calls[0];
    expect(url).toContain('/api/credit-score?score=800');
    expect(options?.method).toBe('POST');
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 400);
    await expect(setCreditScore(800)).rejects.toThrow('HTTP 400');
  });
});
