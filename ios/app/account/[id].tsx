import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { fetchAccountById } from '@/lib/api';
import type { Account } from '@/types/Account';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountById(Number(id))
      .then(setAccount)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load account'),
      );
  }, [id]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Could not load account: {error}</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#98989d" style={styles.loading} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.balanceBlock}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balance}>${account.balance.toFixed(2)}</Text>
        <Text style={styles.name}>{account.name}</Text>
        <Text style={styles.type}>{account.accType}</Text>
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#000',
  },
  loading: {
    marginTop: 24,
  },
  balanceBlock: {
    alignItems: 'center',
    paddingTop: 32,
  },
  balanceLabel: {
    fontFamily: serif,
    fontSize: 13,
    letterSpacing: 1.5,
    color: '#98989d',
    textTransform: 'uppercase',
  },
  balance: {
    fontFamily: serif,
    fontSize: 66,
    fontWeight: '700',
    color: '#fff',
    marginTop: 6,
    textAlign: 'center',
  },
  name: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  type: {
    fontFamily: serif,
    fontSize: 14,
    letterSpacing: 1.5,
    color: '#98989d',
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 32,
    textAlign: 'left',
  },
  error: {
    fontFamily: serif,
    color: '#ff6b6b',
    marginTop: 24,
  },
});
