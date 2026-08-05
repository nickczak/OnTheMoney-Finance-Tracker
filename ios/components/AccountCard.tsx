import { StyleSheet, Text, View } from 'react-native';

import type { Account } from '@/types/Account';

export default function AccountCard({ account }: { account: Account }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{account.name}</Text>
      <Text style={styles.balance}>${account.balance.toFixed(2)}</Text>
      <Text style={styles.type}>{account.accType}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  name: { fontSize: 18, fontWeight: 'bold' },
  balance: { fontSize: 22, color: 'green' },
  type: { color: '#666' },
});
