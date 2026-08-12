import type { Projection } from '../../types/Projection';
import { mockFetchOnce, mockFetchRejects } from './test-utils';
import { projectRetirement } from '../api';

const projection: Projection = {
  status: 'ok',
  worst10: 182345.67,
  median: 892345.12,
  best10: 2456789.34,
  mean: 1045678.9,
  simulations: 10000,
  years: 30,
  percentiles: [],
  worst10Trajectory: [],
  medianTrajectory: [],
  best10Trajectory: [],
  meanTrajectory: [],
};

const input = {
  initialBalance: 10000,
  monthlyContribution: 500,
  returnRate: 7,
  years: 30,
  simulations: 10000,
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('projectRetirement', () => {
  it('returns a projection on success', async () => {
    mockFetchOnce(projection);

    const result = await projectRetirement(input);
    expect(result).toEqual(projection);
  });

  it('POSTs the inputs as query params', async () => {
    const spy = mockFetchOnce(projection);
    await projectRetirement(input);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/project?initialBalance=10000&monthlyContribution=500&returnRate=7&years=30&simulations=10000',
      ),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce({ message: 'Bad Gateway' }, false, 502);
    await expect(projectRetirement(input)).rejects.toThrow('HTTP 502');
  });

  it('rejects on network failure', async () => {
    mockFetchRejects();
    await expect(projectRetirement(input)).rejects.toThrow('Network request failed');
  });
});
