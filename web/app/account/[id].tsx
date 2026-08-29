import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { View } from '@/components/Themed';
import TransactionCard from '@/components/TransactionCard';
import { serif } from '@/constants/Colors';
import { CONTENT_MAX_WIDTH, useResponsiveLayout } from '@/constants/responsive';
import {
  deleteAccount,
  deleteTransaction,
  fetchAccountById,
  fetchAccounts,
  fetchTransactionsById,
  postTransaction,
  updateAccount,
} from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Account } from '@/types/Account';
import type { Transaction } from '@/types/Transaction';

const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT'] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

export default function AccountDetailScreen() {
  const navigation = useNavigation();
  const { scale, isDesktop, isMobile } = useResponsiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [typeEditOpen, setTypeEditOpen] = useState(false);
  const [typeInput, setTypeInput] = useState<AccountType>('CHECKING');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txType, setTxType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txToAccountId, setTxToAccountId] = useState<number | null>(null); // null = "None"

  useEffect(() => {
    fetchAccountById(Number(id))
      .then(setAccount)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load account'),
      );
  }, [id]);

  const loadTransactions = useCallback(() => {
    setTxLoading(true);
    fetchTransactionsById(Number(id))
      .then(setTransactions)
      .catch((err: unknown) =>
        setTxError(err instanceof Error ? err.message : 'Failed to load transactions'),
      )
      .finally(() => setTxLoading(false));
  }, [id]);

  // Refresh whenever the screen regains focus so transactions added elsewhere
  // (or after posting/delete below) show up.
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      fetchAccounts()
        .then(setAccounts)
        .catch(() => {});
    }, [loadTransactions]),
  );

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

  const saveTransaction = useCallback(async () => {
    const amount = Number(txAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      // A selected target makes this a transfer out of this account.
      const isTransfer = txToAccountId !== null;
      await postTransaction(Number(id), {
        type: isTransfer ? 'TRANSFER' : txType,
        amount,
        description: txDescription.trim(),
        fromAccountId: isTransfer ? Number(id) : null,
        toAccountId: isTransfer ? txToAccountId : null,
        // Backend parses yyyy-MM-dd; default new transactions to today.
        date: new Date().toISOString().slice(0, 10),
      });
      setTxDialogOpen(false);
      setTxAmount('');
      setTxDescription('');
      setTxType('DEPOSIT');
      setTxToAccountId(null);
      loadTransactions();
      // Deposit/withdraw/transfer changed the balance server-side; refetch.
      const updated = await fetchAccountById(Number(id));
      setAccount(updated);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Failed to save transaction');
    }
  }, [id, txAmount, txDescription, txType, txToAccountId, loadTransactions]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      loadTransactions();
      // The backend reverses the balance change on delete; refetch to show it.
      const updated = await fetchAccountById(Number(id));
      setAccount(updated);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  }, [deleteTarget, id, loadTransactions]);

  // put a Delete (trash can) button in the top-right of the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setConfirmOpen(true)} hitSlop={10} style={styles.deleteButton}>
          <SymbolView
            name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
            tintColor="#ff6b6b"
            size={20}
          />
        </Pressable>
      ),
    });
  }, [navigation]);

  if (error) {
    return (
      <View style={[styles.container, isDesktop && styles.contentWide]}>
        <Text style={styles.error}>Could not load account: {error}</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={[styles.container, isDesktop && styles.contentWide]}>
        <ActivityIndicator color="#98989d" style={styles.loading} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={[styles.content, isDesktop && styles.contentWide]}
        data={transactions}
        keyExtractor={(t) => String(t.id)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.balanceBlock}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text
                style={[styles.balance, { fontSize: isMobile ? 56 * scale : 88 * scale }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                ${formatMoney(account.balance)}
              </Text>
              <View style={styles.editRow}>
                <Text
                  style={[
                    styles.name,
                    { fontSize: isMobile ? 24 * scale : 34 * scale, flexShrink: 1 },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {account.name}
                </Text>
                <Pressable
                  onPress={() => setNameEditOpen(true)}
                  hitSlop={10}
                  style={styles.namePencil}
                >
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

            <View style={styles.txHeader}>
              <Text style={styles.sectionTitle}>Transactions</Text>
              <Pressable
                onPress={() => setTxDialogOpen(true)}
                hitSlop={8}
                style={styles.addTxButton}
              >
                <Text style={styles.addTxButtonText}>+ Add</Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const toAccountName =
            item.type === 'TRANSFER' && item.toAccountId !== null
              ? accounts.find((a) => a.id === item.toAccountId)?.name
              : undefined;
          return (
            <TransactionCard
              transaction={item}
              accountId={Number(id)}
              toAccountName={toAccountName}
              onDelete={() => setDeleteTarget(item)}
            />
          );
        }}
        ListEmptyComponent={
          txLoading ? (
            <ActivityIndicator color="#98989d" style={styles.loading} />
          ) : txError ? (
            <Text style={styles.error}>{txError}</Text>
          ) : (
            <Text style={styles.empty}>No transactions yet.</Text>
          )
        }
      />

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

      <Modal
        visible={txDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTxDialogOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, styles.txDialog]}>
            <Text style={[styles.confirmTitle, { fontSize: 20 * scale }]}>Add Transaction</Text>
            {txToAccountId === null && (
              <View style={styles.txTypeRow}>
                {(['DEPOSIT', 'WITHDRAW'] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.txTypeButton, type === txType && styles.txTypeButtonActive]}
                    onPress={() => setTxType(type)}
                  >
                    <Text style={styles.txTypeButtonText}>{type}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.txToLabel}>To</Text>
            <View style={styles.txToRow}>
              <Pressable
                style={[styles.txToButton, txToAccountId === null && styles.txToButtonActive]}
                onPress={() => setTxToAccountId(null)}
              >
                <Text style={styles.txToButtonText}>None</Text>
              </Pressable>
              {accounts
                .filter((a) => a.id !== Number(id))
                .map((a) => (
                  <Pressable
                    key={a.id}
                    style={[styles.txToButton, txToAccountId === a.id && styles.txToButtonActive]}
                    onPress={() => setTxToAccountId(a.id)}
                  >
                    <Text style={styles.txToButtonText} numberOfLines={1}>
                      {a.name}
                    </Text>
                  </Pressable>
                ))}
            </View>
            <TextInput
              style={styles.input}
              value={txAmount}
              onChangeText={setTxAmount}
              keyboardType="decimal-pad"
              placeholder="Amount"
              placeholderTextColor="#98989d"
              autoFocus
            />
            <TextInput
              style={styles.input}
              value={txDescription}
              onChangeText={setTxDescription}
              placeholder="Description"
              placeholderTextColor="#98989d"
            />
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmButton} onPress={() => setTxDialogOpen(false)}>
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => saveTransaction()}>
                <Text style={styles.confirmButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={[styles.confirmTitle, { fontSize: 20 * scale }]}>Delete transaction?</Text>
            <Text style={styles.confirmText}>
              This will permanently remove {deleteTarget?.description || 'this transaction'}. This
              cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmButton} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => confirmDelete()}>
                <Text style={[styles.confirmButtonText, styles.confirmDelete]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 24,
  },
  // Desktop: center the screen's content in the shared content column.
  contentWide: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  deleteButton: {
    marginRight: 4,
  },
  loading: {
    marginTop: 24,
  },
  balanceBlock: {
    alignItems: 'center',
    paddingTop: 8,
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
    fontWeight: '700',
    color: '#fff',
    marginTop: 6,
    textAlign: 'center',
  },
  name: {
    fontFamily: serif,
    fontSize: 34,
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
  empty: {
    fontFamily: serif,
    color: '#98989d',
    fontStyle: 'italic',
    padding: 24,
    textAlign: 'center',
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
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addTxButton: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 32,
  },
  addTxButtonText: {
    fontFamily: serif,
    fontSize: 13,
    letterSpacing: 1,
    color: '#fff',
  },
  txDialog: {
    maxWidth: 360,
  },
  txTypeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  txTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1c1c1e',
  },
  txTypeButtonActive: {
    backgroundColor: '#2c2c2e',
  },
  txTypeButtonText: {
    fontFamily: serif,
    fontSize: 13,
    color: '#fff',
  },
  txToLabel: {
    fontFamily: serif,
    fontSize: 13,
    letterSpacing: 1.5,
    color: '#98989d',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  txToRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  txToButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1c1c1e',
    maxWidth: 140,
  },
  txToButtonActive: {
    backgroundColor: '#2c2c2e',
  },
  txToButtonText: {
    fontFamily: serif,
    fontSize: 13,
    color: '#fff',
  },
});
