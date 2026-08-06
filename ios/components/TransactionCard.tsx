import { StyleSheet, Text, View } from 'react-native';

import { serif } from '@/constants/Colors';
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
    borderWidth: 3, // thick white outline
    borderColor: '#fff',
    padding: 16,
    marginVertical: 8,
  },
  title: { fontFamily: serif, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  amount: { fontFamily: serif, fontSize: 22, color: '#fff' },
  date: { fontFamily: serif, color: '#d0d0d0' },
  type: { fontFamily: serif, color: '#d0d0d0', marginTop: 4 },
});
