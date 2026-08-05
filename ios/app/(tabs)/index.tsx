import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import AccountCard from '@/components/AccountCard';
import { Text, View } from '@/components/Themed';
import { fetchAccounts } from '@/lib/api';
import type { Account } from '@/types/Account';

export default function TabOneScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts()
      .then(setAccounts)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load accounts')
      );
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Could not load accounts: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accounts</Text>
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  error: {
    color: 'red',
  },
});
