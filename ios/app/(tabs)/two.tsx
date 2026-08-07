import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import AccountCard from '@/components/AccountCard';
import { View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { createAccount, fetchAccounts } from '@/lib/api';
import type { Account } from '@/types/Account';

export default function TabTwoScreen() {
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAccounts = useCallback(() => {
    fetchAccounts()
      .then(setAccounts)
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : 'Failed to load accounts'),
      )
      .finally(() => setLoading(false));
  }, []);

  // Refetch whenever the tab regains focus so newly added accounts show up.
  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts]),
  );

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

  // add account button (+)
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        accounts.length > 0 ? (
          <Pressable onPress={handleAddAccount} hitSlop={10} style={styles.headerAdd}>
            <Text style={styles.headerAddText}>+</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, accounts.length]);

  if (loadError) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Could not load accounts: {loadError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#98989d" style={styles.loading} />
      ) : accounts.length === 0 ? (
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={handleAddAccount}
        >
          <Text style={styles.addButtonText}>+ Add Account</Text>
        </Pressable>
      ) : null}

      {accounts.length === 0 && !loading ? (
        <Text style={styles.empty}>
          No accounts yet — tap the Add Account button to create your first one.
        </Text>
      ) : null}

      {createError ? <Text style={styles.error}>{createError}</Text> : null}

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
    backgroundColor: '#000',
  },
  addButton: {
    backgroundColor: '#2c2c2e',
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: serif,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerAdd: {
    marginRight: 15,
  },
  headerAddText: {
    color: '#fff',
    fontFamily: serif,
    fontSize: 28,
    lineHeight: 28,
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 16,
    fontFamily: serif,
  },
  empty: {
    color: '#98989d',
    fontFamily: serif,
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  loading: {
    marginTop: 24,
  },
});
