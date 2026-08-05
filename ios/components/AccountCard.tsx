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
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  balance: { fontSize: 22, color: '#30d158' },
  type: { color: '#8e8e93' },
});
