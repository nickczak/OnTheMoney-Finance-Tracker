import { StyleSheet, Text, View } from 'react-native';

import { palette, sans } from '@/constants/Colors';
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
    backgroundColor: palette.surface,
    borderWidth: 1, // hairline outline
    borderColor: palette.border,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  title: { fontFamily: sans, fontSize: 17, fontWeight: '600', color: palette.text },
  amount: { fontFamily: sans, fontSize: 20, fontWeight: '600', color: palette.green },
  date: { fontFamily: sans, color: palette.textDim },
  type: { fontFamily: sans, color: palette.textDim, marginTop: 4 },
});
