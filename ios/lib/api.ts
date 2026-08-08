import type { Account } from '@/types/Account';
import type { Transaction } from '@/types/Transaction';
import type { NetWorthHistoryPoint } from '@/types/NetWorth';

// Overridable so a physical device or deployed API can point elsewhere:
//   EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

// Account API functions

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch(`${BASE_URL}/api/accounts`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAccountByName(name: string): Promise<Account> {
  const res = await fetch(`${BASE_URL}/api/accounts?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAccountById(id: number): Promise<Account> {
  const res = await fetch(`${BASE_URL}/api/accounts/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createAccount(account: Omit<Account, 'id'>): Promise<Account> {
  const res = await fetch(
    `${BASE_URL}/api/accounts?name=${encodeURIComponent(account.name)}&balance=${account.balance}&accType=${account.accType}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateAccount(account: Account): Promise<Account> {
  const res = await fetch(
    `${BASE_URL}/api/accounts/${account.id}?name=${encodeURIComponent(account.name)}&balance=${account.balance}&accType=${account.accType}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAccount(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/accounts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteAllAccounts(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/accounts`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Transaction API functions

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${BASE_URL}/api/transactions`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTransactionsById(accountId: number): Promise<Transaction[]> {
  const res = await fetch(`${BASE_URL}/api/transactions?accountId=${accountId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTransactionsByDateRange(
  start: string,
  end: string,
): Promise<Transaction[]> {
  const res = await fetch(
    `${BASE_URL}/api/transactions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Posts a single-account transaction (deposit/withdraw) or a transfer,
// dispatching to the matching backend endpoint based on `transaction.type`.
// `accountId` goes in the URL path for deposits/withdrawals; transfers instead
// use `transaction.fromAccountId` / `transaction.toAccountId`.
export async function postTransaction(
  accountId: number,
  transaction: Omit<Transaction, 'id'>,
): Promise<Transaction> {
  let url: string;

  if (transaction.type === 'TRANSFER') {
    url = `${BASE_URL}/api/transfers?fromAccountId=${transaction.fromAccountId}&toAccountId=${transaction.toAccountId}&amount=${transaction.amount}&description=${encodeURIComponent(transaction.description ?? '')}&date=${encodeURIComponent(transaction.date)}`;
  } else {
    const action = transaction.type.toLowerCase();
    url = `${BASE_URL}/api/accounts/${accountId}/${action}?amount=${transaction.amount}&description=${encodeURIComponent(transaction.description)}&date=${encodeURIComponent(transaction.date)}`;
  }

  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateTransaction(
  id: number,
  updates: Partial<Omit<Transaction, 'id'>>,
): Promise<Transaction> {
  const params = new URLSearchParams();

  if (updates.amount != null) params.append('amount', updates.amount.toString());
  if (updates.description != null) params.append('description', updates.description);
  if (updates.date != null) params.append('date', updates.date);

  const res = await fetch(`${BASE_URL}/api/transactions/${id}?${params.toString()}`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/transactions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Net Worth API functions

export async function fetchNetWorth(): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/net-worth`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { netWorth: number } = await res.json();
  return data.netWorth;
}

export async function fetchTotalAssets(): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/total-assets`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { totalAssets: number } = await res.json();
  return data.totalAssets;
}

export async function fetchTotalLiabilities(): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/total-liabilities`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { totalLiabilities: number } = await res.json();
  return data.totalLiabilities;
}

export async function fetchInTheRed(): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/in-the-red`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { inTheRed: boolean } = await res.json();
  return data.inTheRed;
}

export async function fetchInTheGreen(): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/in-the-green`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { inTheGreen: boolean } = await res.json();
  return data.inTheGreen;
}

export async function fetchNetWorthHistory(): Promise<NetWorthHistoryPoint[]> {
  const res = await fetch(`${BASE_URL}/api/net-worth/history`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function recordNetWorthSnapshot(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/net-worth/snapshot`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Credit Score API function
// Stock Market API functions
// Monte Carlo Projection API function
