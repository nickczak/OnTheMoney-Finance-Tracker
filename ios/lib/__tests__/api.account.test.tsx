import type { Account } from '../../types/Account';
import { mockFetchOnce, mockFetchRejects } from './test-utils';
import {
  fetchAccounts,
  fetchAccountByName,
  fetchAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  deleteAllAccounts,
} from '../api';

const checking: Account = { id: 1, name: 'Checking Account', balance: 5000, accType: 'CHECKING' };
const savings: Account = { id: 2, name: 'Savings Account', balance: 20000, accType: 'SAVINGS' };

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchAccounts', () => {
  it('returns accounts on success', async () => {
    mockFetchOnce([checking, savings]);

    const data = await fetchAccounts();
    expect(data).toEqual([checking, savings]);
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce({ message: 'Not Found' }, false, 404);
    await expect(fetchAccounts()).rejects.toThrow('HTTP 404');
  });

  it('rejects on network failure', async () => {
    mockFetchRejects();
    await expect(fetchAccounts()).rejects.toThrow('Network request failed');
  });
});

describe('fetchAccountByName', () => {
  it('requests the account by name', async () => {
    mockFetchOnce(checking);
    const data = await fetchAccountByName('Checking Account');
    expect(data).toEqual(checking);
  });

  it('encodes special characters in the name', async () => {
    const spy = mockFetchOnce(checking);
    await fetchAccountByName('Café & Son');
    const [url] = spy.mock.calls[0];
    expect(url).toContain('name=Caf%C3%A9%20%26%20Son');
  });
});

describe('fetchAccountById', () => {
  it('fetchAccountById requests the account by id', async () => {
    mockFetchOnce(savings);
    const data = await fetchAccountById(2);
    expect(data).toEqual(savings);
  });
});

describe('createAccount', () => {
  it('POSTs account details as query params', async () => {
    const input: Omit<Account, 'id'> = { name: 'Roth IRA', balance: 10000, accType: 'INVESTMENT' };
    const created: Account = { id: 3, ...input };
    const spy = mockFetchOnce(created);

    const result = await createAccount(input);
    expect(result).toEqual(created);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/accounts?name=Roth%20IRA&balance=10000&accType=INVESTMENT'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('updateAccount', () => {
  it('PUTs the account details', async () => {
    const input: Account = { id: 3, name: '401k', balance: 10000, accType: 'INVESTMENT' };
    const spy = mockFetchOnce(input);

    const result = await updateAccount(input);
    expect(result).toEqual(input);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/accounts/3?name=401k&balance=10000&accType=INVESTMENT'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('deleteAccount', () => {
  it('DELETEs the account by id', async () => {
    const spy = mockFetchOnce(null);
    await deleteAccount(3);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/accounts/3'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on HTTP error', async () => {
    mockFetchOnce(null, false, 404);
    await expect(deleteAccount(3)).rejects.toThrow('HTTP 404');
  });
});

describe('deleteAllAccounts', () => {
  it('DELETEs all accounts', async () => {
    const spy = mockFetchOnce(null);
    await deleteAllAccounts();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/accounts'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
