import type { Account } from '@/types/Account';
import type { Transaction } from '@/types/Transaction';

const BASE_URL = 'http://localhost:8080';

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
  const res = await fetch(`${BASE_URL}/api/accounts?name=${encodeURIComponent(account.name)}&balance=${account.balance}&accType=${account.accType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateAccount(account: Account): Promise<Account> {
  const res = await fetch(`${BASE_URL}/api/accounts/${account.id}?name=${encodeURIComponent(account.name)}&balance=${account.balance}&accType=${account.accType}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  });
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

// Creates a deposit, withdrawal, or transfer depending on `transaction.type`.
// `accountId` is the account for deposits/withdrawals; transfers instead use
// `transaction.fromAccountId` and `transaction.toAccountId`.
export async function deposit(
  accountId: number,
  transaction: Omit<Transaction, 'id'>,
): Promise<Transaction> {
  let url: string;

  if (transaction.type === 'DEPOSIT') {
    url = `${BASE_URL}/api/accounts/${accountId}/deposit?amount=${transaction.amount}&description=${encodeURIComponent(transaction.description)}&date=${encodeURIComponent(transaction.date)}`;
  } else if (transaction.type === 'WITHDRAW') {
    url = `${BASE_URL}/api/accounts/${accountId}/withdraw?amount=${transaction.amount}&description=${encodeURIComponent(transaction.description)}&date=${encodeURIComponent(transaction.date)}`;
  } else {
    // TRANSFER — the backend has no description param on /transfers
    url = `${BASE_URL}/api/transfers?fromAccountId=${transaction.fromAccountId}&toAccountId=${transaction.toAccountId}&amount=${transaction.amount}&date=${encodeURIComponent(transaction.date)}`;
  }

  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateTransaction(id: number, updates: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
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

// Networth API function
// Credit Score API function
// Stock Market API functions
// Monte Carlo Projection API function
