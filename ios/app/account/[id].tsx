import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { useResponsiveLayout } from '@/constants/responsive';
import { deleteAccount, fetchAccountById, updateAccount } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Account } from '@/types/Account';

const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT'] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

export default function AccountDetailScreen() {
  const navigation = useNavigation();
  const { scale } = useResponsiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [typeEditOpen, setTypeEditOpen] = useState(false);
  const [typeInput, setTypeInput] = useState<AccountType>('CHECKING');

  useEffect(() => {
    fetchAccountById(Number(id))
      .then(setAccount)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load account'),
      );
  }, [id]);

  const onDelete = useCallback(async () => {
    await deleteAccount(Number(id));
    navigation.goBack();
  }, [id, navigation]);

  const saveName = useCallback(async () => {
    if (!account || nameInput.trim() === '') return;
    const updated = await updateAccount({ ...account, name: nameInput.trim() });
    setAccount(updated);
    setNameEditOpen(false);
    setNameInput('');
  }, [account, nameInput]);

  const saveType = useCallback(async () => {
    if (!account) return;
    const updated = await updateAccount({ ...account, accType: typeInput });
    setAccount(updated);
    setTypeEditOpen(false);
  }, [account, typeInput]);

  // put a Delete button in the top-right of the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setConfirmOpen(true)} hitSlop={10}>
          <Text style={styles.deleteButton}>Delete</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

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
        <Text
          style={[styles.balance, { fontSize: 88 * scale, width: '100%' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          ${formatMoney(account.balance)}
        </Text>
        <View style={styles.editRow}>
          <Text
            style={[styles.name, { fontSize: 34 * scale, flexShrink: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {account.name}
          </Text>
          <Pressable onPress={() => setNameEditOpen(true)} hitSlop={10} style={styles.namePencil}>
            <SymbolView
              name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              size={14}
              tintColor="#98989d"
            />
          </Pressable>
        </View>
        <View style={styles.editRow}>
          <Text style={[styles.type, { fontSize: 14 * scale }]}>{account.accType}</Text>
          <Pressable onPress={() => setTypeEditOpen(true)} hitSlop={10}>
            <SymbolView
              name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              size={12}
              tintColor="#98989d"
            />
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>

      <Modal
        visible={nameEditOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNameEditOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.nameEditDialog}>
            <Text style={[styles.confirmTitle, { fontSize: 20 * scale }]}>Edit Account Name</Text>
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
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmButton} onPress={() => setNameEditOpen(false)}>
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => saveName()}>
                <Text style={styles.confirmButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={typeEditOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTypeEditOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={[styles.confirmTitle, { fontSize: 20 * scale }]}>Edit Account Type</Text>
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
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmButton} onPress={() => setTypeEditOpen(false)}>
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => saveType()}>
                <Text style={styles.confirmButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={[styles.confirmTitle, { fontSize: 20 * scale }]}>Delete account?</Text>
            <Text style={styles.confirmText}>
              This will permanently remove {account.name}. This cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmButton} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => onDelete()}>
                <Text style={[styles.confirmButtonText, styles.confirmDelete]}>Delete</Text>
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
    padding: 24,
    backgroundColor: '#000',
  },
  deleteButton: {
    color: '#ff6b6b',
    fontFamily: serif,
    fontSize: 16,
    marginRight: 20,
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  namePencil: {
    marginTop: 12,
  },
  typePencil: {
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputIcon: {
    marginTop: -20,
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 24,
  },
  nameEditDialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 20,
  },
  confirmTitle: {
    fontFamily: serif,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  confirmText: {
    fontFamily: serif,
    fontSize: 15,
    color: '#d0d0d0',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  confirmButtonText: {
    fontFamily: serif,
    fontSize: 16,
    color: '#fff',
  },
  confirmDelete: {
    color: '#ff6b6b',
  },
  input: {
    fontFamily: serif,
    fontSize: 20,
    color: '#fff',
    backgroundColor: '#000',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    textAlign: 'left',
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
});
