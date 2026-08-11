import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import AccountCard from '@/components/AccountCard';
import PhoneButton from '@/components/PhoneButton';
import { View } from '@/components/Themed';
import { palette, sans } from '@/constants/Colors';
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
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Name"
              placeholderTextColor="#98989d"
              autoFocus
            />
            <TextInput
              style={styles.input}
              value={balanceInput}
              onChangeText={setBalanceInput}
              keyboardType="decimal-pad"
              placeholder="Balance"
              placeholderTextColor="#98989d"
            />
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
              <PhoneButton onPress={() => setDialogOpen(false)} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancel</Text>
              </PhoneButton>
              <PhoneButton onPress={() => saveAccount()} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Save</Text>
              </PhoneButton>
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
    backgroundColor: palette.bg,
  },
  addButton: {
    backgroundColor: palette.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    color: '#000',
    fontFamily: sans,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerAdd: {
    marginRight: 15,
  },
  headerAddText: {
    color: palette.green,
    fontFamily: sans,
    fontSize: 28,
    lineHeight: 28,
  },
  error: {
    color: palette.red,
    marginBottom: 16,
    fontFamily: sans,
  },
  empty: {
    color: palette.textDim,
    fontFamily: sans,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    padding: 24,
    justifyContent: 'space-between',
  },
  dialogTitle: {
    fontFamily: sans,
    fontSize: 20,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 16,
  },
  input: {
    fontFamily: sans,
    fontSize: 18,
    color: palette.text,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 10,
  },
  typeButtonActive: {
    backgroundColor: palette.green,
  },
  typeButtonText: {
    fontFamily: sans,
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  dialogButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: palette.surfaceAlt,
    overflow: 'hidden',
  },
  dialogButtonText: {
    fontFamily: sans,
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
});
