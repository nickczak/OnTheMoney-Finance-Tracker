import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import AccountCard from '@/components/AccountCard';
import { View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { createAccount, fetchAccounts } from '@/lib/api';
import type { Account } from '@/types/Account';

const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT'] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

export default function TabTwoScreen() {
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [balanceInput, setBalanceInput] = useState<string>('');
  const [typeInput, setTypeInput] = useState<AccountType>('CHECKING');

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

  const saveAccount = async () => {
    setCreateError(null);
    const balance = Number(balanceInput);
    if (nameInput.trim() === '' || !Number.isFinite(balance)) return;
    try {
      const account = await createAccount({
        name: nameInput.trim(),
        balance,
        accType: typeInput,
      });
      setAccounts((prev) => [...prev, account]);
      setDialogOpen(false);
      setNameInput('');
      setBalanceInput('');
      setTypeInput('CHECKING');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  // add account button (+)
  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        accounts.length > 0 ? (
          <Pressable onPress={() => setDialogOpen(true)} hitSlop={10} style={styles.headerAdd}>
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
          onPress={() => setDialogOpen(true)}
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

      <Modal
        visible={dialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDialogOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Add Account</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIcon}>
                <SymbolView
                  name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                  tintColor="#98989d"
                  size={24}
                />
              </View>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Name"
                placeholderTextColor="#98989d"
                autoFocus
              />
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputIcon}>
                <SymbolView
                  name={{
                    ios: 'dollarsign.circle.fill',
                    android: 'payments',
                    web: 'payments',
                  }}
                  tintColor="#98989d"
                  size={24}
                />
              </View>
              <TextInput
                style={styles.input}
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="decimal-pad"
                placeholder="Balance"
                placeholderTextColor="#98989d"
              />
            </View>
            <View style={styles.typeRow}>
              {ACCOUNT_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.typeButton, type === typeInput && styles.typeButtonActive]}
                  onPress={() => setTypeInput(type)}
                >
                  <Text style={styles.typeButtonText}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.dialogButtons}>
              <Pressable style={styles.dialogButton} onPress={() => setDialogOpen(false)}>
                <Text style={styles.dialogButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dialogButton} onPress={() => saveAccount()}>
                <Text style={styles.dialogButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    height: 400,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 24,
    justifyContent: 'space-between',
  },
  dialogTitle: {
    fontFamily: serif,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputIcon: {
    marginTop: -12,
  },
  input: {
    flex: 1,
    fontFamily: serif,
    fontSize: 20,
    color: '#fff',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    textAlign: 'left',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
    maxWidth: 280,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1c1c1e',
  },
  typeButtonActive: {
    backgroundColor: '#2c2c2e',
  },
  typeButtonText: {
    fontFamily: serif,
    fontSize: 13,
    color: '#fff',
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  dialogButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  dialogButtonText: {
    fontFamily: serif,
    fontSize: 16,
    color: '#fff',
  },
});
