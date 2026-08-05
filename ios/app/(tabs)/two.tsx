import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import AccountCard from '@/components/AccountCard';
import { Text, View } from '@/components/Themed';
import { createAccount, fetchAccounts } from '@/lib/api';
import type { Account } from '@/types/Account';

export default function TabTwoScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAccounts()
      .then(setAccounts)
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : 'Failed to load accounts')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loadError) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Could not load accounts: {loadError}</Text>
      </View>
    );
  }

  const handleAddAccount = async () => {
    setCreateError(null);
    try {
      const account = await createAccount({
        name: 'New Account',
        balance: 100,
        accType: 'CHECKING',
      });
      setAccounts((prev) => [...prev, account]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handleAddAccount}
      >
        <Text style={styles.buttonText}>Add Account</Text>
      </Pressable>
      {createError ? <Text style={styles.error}>{createError}</Text> : null}

      {loading ? null : accounts.length === 0 ? (
        <Text style={styles.empty}>
          No accounts yet — tap "Add Account" to create your first one.
        </Text>
      ) : (
        accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))
      )}
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
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
  empty: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 24,
  },
});
