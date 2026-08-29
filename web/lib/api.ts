import type { Account } from '@/types/Account';
import type { Projection, ProjectionInput } from '@/types/Projection';
import type { Transaction } from '@/types/Transaction';
import type { NetWorthHistoryPoint } from '@/types/NetWorth';
import { getToken, setSession, clearSession, loadSession, type AuthUser } from './session';

export { loadSession, getSession, getToken, clearSession } from './session';
export type { AuthUser, Session } from './session';

// Overridable so a deployed API can point elsewhere:
//   EXPO_PUBLIC_API_URL=http://192.168.1.10:8080 npx expo start
// NOTE: `||` (not ??) so an empty EXPO_PUBLIC_API_URL falls back to the default
// instead of producing relative URLs, which native fetch rejects with the
// cryptic "URL is not valid or contains user credentials" error.
const BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080');

function normalizeBaseUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, '');
  try {
    // Validate up front — a bad host here used to surface as an obscure
    // networking error on the first request instead of at startup.
    new URL(url);
  } catch {
    throw new Error(
      `Invalid EXPO_PUBLIC_API_URL "${raw}". It must be an absolute URL like http://192.168.1.10:8080.`,
    );
  }
  return url;
}

/**
 * Central fetch wrapper. Attaches the session token as an Authorization header
 * to every call; the backend's AuthInterceptor resolves the user from it and
 * answers 401 for missing/expired tokens.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

/** POSTs a JSON body to an /api/auth/* endpoint (which manage their own tokens). */
async function authPost(
  path: string,
  body: Record<string, string>,
  throwOnError = true,
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (throwOnError && !res.ok) throw new Error(await errorMessage(res));
  return res;
}

function requireToken(): string {
  const token = getToken();
  if (!token) throw new Error('Not authenticated.');
  return token;
}

// Auth API functions

export async function signup(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthUser> {
  // The backend opens a session on signup, so no second login call is needed.
  return authenticate('/api/auth/signup', { email, password, displayName });
}

export async function login(email: string, password: string): Promise<AuthUser> {
  return authenticate('/api/auth/login', { email, password });
}

async function authenticate(path: string, body: Record<string, string>): Promise<AuthUser> {
  // Plain fetch: /api/auth/* is exempt from the backend interceptor, and JSON
  // bodies keep emails (with their @) and passwords out of URLs entirely.
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = (await res.json()) as { token: string; user: AuthUser };
  await setSession({ token: data.token, user: data.user });
  return data.user;
}

/** Logs out locally first, then drops the server-side session best-effort. */
export async function logout(): Promise<void> {
  const token = getToken();
  await clearSession();
  if (token) {
    authPost('/api/auth/logout', { token }).catch(() => {});
  }
}

/** Extends the session on app start. Clears it if the server rejects the token. */
export async function refreshSession(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await authPost('/api/auth/refresh', { token }, false);
    if (res.status === 401) {
      await clearSession();
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { token: string; user: AuthUser };
    await setSession({ token: data.token, user: data.user });
    return data.user;
  } catch {
    return null;
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const token = requireToken();
  const res = await authPost('/api/auth/me', { token });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function updateProfile(displayName: string, email: string): Promise<AuthUser> {
  const token = requireToken();
  const res = await authPost('/api/auth/update', { token, displayName, email });
  if (!res.ok) throw new Error(await errorMessage(res));
  const user = (await res.json()) as AuthUser;
  await setSession({ token, user });
  return user;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await authPost('/api/auth/change-password', {
    token: requireToken(),
    oldPassword,
    newPassword,
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export async function deleteMyAccount(): Promise<void> {
  const res = await authPost('/api/auth/delete-account', { token: requireToken() });
  if (!res.ok) throw new Error(await errorMessage(res));
  await clearSession();
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // fall through to status-only message
  }
  return `HTTP ${res.status}`;
}

// Account API functions

export async function fetchAccounts(): Promise<Account[]> {
  const res = await apiFetch(`/api/accounts`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAccountByName(name: string): Promise<Account> {
  const res = await apiFetch(`/api/accounts?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAccountById(id: number): Promise<Account> {
  const res = await apiFetch(`/api/accounts/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createAccount(account: Omit<Account, 'id'>): Promise<Account> {
  const res = await apiFetch(
    `/api/accounts?name=${encodeURIComponent(account.name)}&balance=${account.balance}&accType=${account.accType}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateAccount(account: Account): Promise<Account> {
  const res = await apiFetch(
    `/api/accounts/${account.id}?name=${encodeURIComponent(account.name)}&balance=${account.balance}&accType=${account.accType}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAccount(id: number): Promise<void> {
  const res = await apiFetch(`/api/accounts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteAllAccounts(): Promise<void> {
  const res = await apiFetch(`/api/accounts`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Transaction API functions

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await apiFetch(`/api/transactions`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTransactionsById(accountId: number): Promise<Transaction[]> {
  const res = await apiFetch(`/api/transactions?accountId=${accountId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTransactionsByDateRange(
  start: string,
  end: string,
): Promise<Transaction[]> {
  const res = await apiFetch(
    `/api/transactions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
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
    url = `/api/transfers?fromAccountId=${transaction.fromAccountId}&toAccountId=${transaction.toAccountId}&amount=${transaction.amount}&description=${encodeURIComponent(transaction.description ?? '')}&date=${encodeURIComponent(transaction.date)}`;
  } else {
    const action = transaction.type.toLowerCase();
    url = `/api/accounts/${accountId}/${action}?amount=${transaction.amount}&description=${encodeURIComponent(transaction.description)}&date=${encodeURIComponent(transaction.date)}`;
  }

  const res = await apiFetch(url, { method: 'POST' });
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

  const res = await apiFetch(`/api/transactions/${id}?${params.toString()}`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await apiFetch(`/api/transactions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Net Worth API functions

export async function fetchNetWorth(): Promise<number> {
  const res = await apiFetch(`/api/net-worth`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { netWorth: number } = await res.json();
  return data.netWorth;
}

export async function fetchTotalAssets(): Promise<number> {
  const res = await apiFetch(`/api/total-assets`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { totalAssets: number } = await res.json();
  return data.totalAssets;
}

export async function fetchTotalLiabilities(): Promise<number> {
  const res = await apiFetch(`/api/total-liabilities`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { totalLiabilities: number } = await res.json();
  return data.totalLiabilities;
}

export async function fetchInTheRed(): Promise<boolean> {
  const res = await apiFetch(`/api/in-the-red`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { inTheRed: boolean } = await res.json();
  return data.inTheRed;
}

export async function fetchInTheGreen(): Promise<boolean> {
  const res = await apiFetch(`/api/in-the-green`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { inTheGreen: boolean } = await res.json();
  return data.inTheGreen;
}

export async function fetchNetWorthHistory(): Promise<NetWorthHistoryPoint[]> {
  const res = await apiFetch(`/api/net-worth/history`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function recordNetWorthSnapshot(): Promise<void> {
  const res = await apiFetch(`/api/net-worth/snapshot`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Credit Score API function
export async function fetchCreditScore(): Promise<number> {
  const res = await apiFetch(`/api/credit-score`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { score: number } = await res.json();
  return data.score;
}

export async function setCreditScore(score: number): Promise<void> {
  const res = await apiFetch(`/api/credit-score?score=${score}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Stock Market API functions

export interface StockQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export interface StockSearchResult {
  symbol: string;
  description: string;
  type: string;
  displaySymbol: string;
}

export interface StockCandle {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  v: number[];
  t: number[];
  s: string;
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const res = await apiFetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function searchStocks(q: string): Promise<StockSearchResult[]> {
  const res = await apiFetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStockOverview(): Promise<{ indices: StockQuote[] }> {
  const res = await apiFetch('/api/stocks/overview');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStockCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number,
): Promise<StockCandle> {
  const params = new URLSearchParams({
    symbol,
    resolution,
    from: String(from),
    to: String(to),
  });
  const res = await apiFetch(`/api/stocks/candles?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchWatchlist(): Promise<StockQuote[]> {
  const res = await apiFetch('/api/stocks/watchlist');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function addToWatchlist(symbol: string): Promise<void> {
  const res = await apiFetch(`/api/stocks/watchlist?symbol=${encodeURIComponent(symbol)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  const res = await apiFetch(`/api/stocks/watchlist/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Monte Carlo Projection API function

export async function projectRetirement(input: ProjectionInput): Promise<Projection> {
  const params = new URLSearchParams();
  params.append('initialBalance', String(input.initialBalance));
  params.append('monthlyContribution', String(input.monthlyContribution));
  params.append('returnRate', String(input.returnRate)); // percent, e.g. 7 for 7%
  params.append('years', String(input.years));
  params.append('simulations', String(input.simulations));

  const res = await apiFetch(`/api/project?${params.toString()}`, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
