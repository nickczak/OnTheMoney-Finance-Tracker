export type Account = {
  id: number;
  name: string;
  balance: number;
  accType: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'LOAN' | 'INVESTMENT';
};
