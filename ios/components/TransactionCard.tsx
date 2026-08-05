import { StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/types/Transaction';

export default function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{transaction.description}</Text>
      <Text style={styles.amount}>${transaction.amount.toFixed(2)}</Text>
      <Text style={styles.date}>{new Date(transaction.date).toLocaleDateString()}</Text>
      <Text style={styles.type}>{transaction.type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  amount: { fontSize: 22, color: '#30d158' },
  date: { color: '#8e8e93' },
  type: { color: '#8e8e93', marginTop: 4 },
});
