export type Transaction = {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description: string;
  date: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER';
};
