export type Transaction = {
  id: number;
  fromAccountId: number | null; // backend returns null for deposits/withdrawals
  toAccountId: number | null; // '?' allows abscence of the value, but backend expects null
  amount: number;
  description: string;
  date: string;
  type: "DEPOSIT" | "WITHDRAW" | "TRANSFER";
};
