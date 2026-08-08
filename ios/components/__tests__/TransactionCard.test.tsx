import { render, screen } from '@testing-library/react-native';

import TransactionCard from '@/components/TransactionCard';
import type { Transaction } from '@/types/Transaction';

const tx: Transaction = {
  id: 1,
  fromAccountId: 1,
  toAccountId: 1,
  type: 'DEPOSIT',
  amount: 100.5,
  description: 'Payday',
  date: '2026-01-01',
};

test('renders description and amount', async () => {
  await render(<TransactionCard transaction={tx} />);
  expect(screen.getByText('Payday')).toBeTruthy();
  expect(screen.getByText('$100.50')).toBeTruthy();
});
