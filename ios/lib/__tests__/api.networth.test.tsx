import type { NetWorthHistoryPoint } from '../../types/NetWorth';
import { mockFetchOnce, mockFetchRejects } from './test-utils';
import {
  fetchNetWorth,
  fetchTotalAssets,
  fetchTotalLiabilities,
  fetchInTheRed,
  fetchInTheGreen,
  fetchNetWorthHistory,
  recordNetWorthSnapshot,
} from '../api';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchNetWorth', () => {
  it('returns the net worth number', async () => {
    mockFetchOnce({ netWorth: 12500 });
    await expect(fetchNetWorth()).resolves.toBe(12500);
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 500);
    await expect(fetchNetWorth()).rejects.toThrow('HTTP 500');
  });

  it('rejects on network failure', async () => {
    mockFetchRejects();
    await expect(fetchNetWorth()).rejects.toThrow('Network request failed');
  });
});

describe('fetchTotalAssets', () => {
  it('returns the total assets number', async () => {
    mockFetchOnce({ totalAssets: 25000 });
    await expect(fetchTotalAssets()).resolves.toBe(25000);
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 500);
    await expect(fetchTotalAssets()).rejects.toThrow('HTTP 500');
  });
});

describe('fetchTotalLiabilities', () => {
  it('returns the total liabilities number', async () => {
    mockFetchOnce({ totalLiabilities: 12500 });
    await expect(fetchTotalLiabilities()).resolves.toBe(12500);
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 500);
    await expect(fetchTotalLiabilities()).rejects.toThrow('HTTP 500');
  });
});

describe('fetchInTheRed', () => {
  it('returns true when net worth is negative', async () => {
    mockFetchOnce({ inTheRed: true });
    await expect(fetchInTheRed()).resolves.toBe(true);
  });

  it('returns false when net worth is not negative', async () => {
    mockFetchOnce({ inTheRed: false });
    await expect(fetchInTheRed()).resolves.toBe(false);
  });
});

describe('fetchInTheGreen', () => {
  it('returns true when net worth is positive', async () => {
    mockFetchOnce({ inTheGreen: true });
    await expect(fetchInTheGreen()).resolves.toBe(true);
  });

  it('returns false when net worth is not positive', async () => {
    mockFetchOnce({ inTheGreen: false });
    await expect(fetchInTheGreen()).resolves.toBe(false);
  });
});

describe('fetchNetWorthHistory', () => {
  it('returns history points', async () => {
    const history: NetWorthHistoryPoint[] = [
      { id: 1, netWorth: 1000, date: '2026-01-01' },
      { id: 2, netWorth: 1250, date: '2026-02-01' },
    ];
    mockFetchOnce(history);
    await expect(fetchNetWorthHistory()).resolves.toEqual(history);
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 500);
    await expect(fetchNetWorthHistory()).rejects.toThrow('HTTP 500');
  });
});

describe('recordNetWorthSnapshot', () => {
  it('POSTs a snapshot to the endpoint', async () => {
    const spy = mockFetchOnce({ status: 'recorded' });
    await recordNetWorthSnapshot();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/net-worth/snapshot'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 500);
    await expect(recordNetWorthSnapshot()).rejects.toThrow('HTTP 500');
  });
});
