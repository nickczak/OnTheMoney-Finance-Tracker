import type { Account } from '@/types/Account';

const BASE_URL = 'http://localhost:8080';

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch(`${BASE_URL}/api/accounts`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAccountsByName(name: string): Promise<Account[]> {
  const res = await fetch(`${BASE_URL}/api/accounts?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
