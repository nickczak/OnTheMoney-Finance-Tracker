/** A bank connection (Plaid "Item") as returned by the backend. */
export type PlaidItem = {
  id: number;
  plaidItemId: string;
  /** opaque sync cursor from Plaid; not user-meaningful */
  cursor: string | null;
  institutionId: string | null;
  institutionName: string | null;
  /** CONNECTED | LOGIN_REQUIRED | PENDING_EXPIRATION | ERROR | DISCONNECTED */
  status: string;
  createdAt: string;
  lastSyncAt: string | null;
};

export type PlaidLinkTokenResponse = {
  link_token: string;
};

export type PlaidSyncResult = {
  accounts: number;
  added: number;
  modified: number;
  removed: number;
};

export type PlaidExchangeInput = {
  /** one-time token from Plaid Link's onSuccess callback */
  publicToken: string;
  institutionId?: string | null;
  institutionName?: string | null;
};
