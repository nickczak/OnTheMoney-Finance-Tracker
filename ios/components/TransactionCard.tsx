import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { serif } from '@/constants/Colors';
import { formatDate, formatMoney } from '@/lib/format';
import type { Transaction } from '@/types/Transaction';

export default function TransactionCard({
  transaction,
  accountId,
  toAccountName,
  onDelete,
}: {
  transaction: Transaction;
  /** The account this card is displayed under, used to decide whether a
   *  transfer moves money in (+) or out (-). Omit to hide the sign. */
  accountId?: number;
  /** Destination account name for transfers, shown after the type. */
  toAccountName?: string;
  onDelete?: () => void;
}) {
  let sign: '+' | '-' | null = null;
  if (accountId !== undefined) {
    if (transaction.type === 'DEPOSIT') sign = '+';
    else if (transaction.type === 'WITHDRAW') sign = '-';
    else if (transaction.type === 'TRANSFER') {
      if (transaction.fromAccountId === accountId) sign = '-';
      else if (transaction.toAccountId === accountId) sign = '+';
    }
  }
  const color = sign === '+' ? '#00ff88' : sign === '-' ? '#ff6b6b' : '#fff';

  return (
    <View style={styles.card}>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteButton}>
          <SymbolView name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }} tintColor="#ff6b6b" size={16} />
        </Pressable>
      ) : null}
      <Text style={styles.title}>{transaction.description}</Text>
      <Text style={[styles.amount, { color }]}>
        {sign !== null ? sign : ''}${formatMoney(transaction.amount)}
      </Text>
      <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      <Text style={styles.type}>
        {transaction.type}
        {transaction.type === 'TRANSFER' && toAccountName ? ` → ${toAccountName}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000',
    borderWidth: 3, // thick white outline
    borderColor: '#fff',
    padding: 16,
    marginVertical: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  title: { fontFamily: serif, fontSize: 18, fontWeight: 'bold', color: '#fff', paddingRight: 24 },
  amount: { fontFamily: serif, fontSize: 22 },
  date: { fontFamily: serif, color: '#d0d0d0' },
  type: { fontFamily: serif, color: '#d0d0d0', marginTop: 4 },
});