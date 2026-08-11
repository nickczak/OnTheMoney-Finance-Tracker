import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import AccountCard from '@/components/AccountCard';
import PhoneButton from '@/components/PhoneButton';
import { palette, sans } from '@/constants/Colors';
import {
  fetchNetWorth,
  fetchInTheGreen,
  fetchInTheRed,
  fetchNetWorthHistory,
  fetchTotalAssets,
  fetchTotalLiabilities,
  recordNetWorthSnapshot,
  fetchAccounts,
  fetchCreditScore,
  setCreditScore,
} from '@/lib/api';
import type { NetWorthHistoryPoint } from '@/types/NetWorth';
import type { Account } from '@/types/Account';

type Trend = { amount: number; percent: number | null } | null;
type Quote = { point: NetWorthHistoryPoint; change: number | null; percent: number | null };
export type RangeKey = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
const RANGES: RangeKey[] = ['1W', '1M', '3M', '1Y', 'YTD', 'ALL'];

function creditRating(score: number): { label: string; color: string } {
  if (score < 580) return { label: 'Poor', color: '#e5484d' };
  if (score < 669) return { label: 'Fair', color: '#ff9500' };
  if (score < 739) return { label: 'Good', color: '#ffcc00' };
  if (score < 799) return { label: 'Very Good', color: '#34c759' };
  return { label: 'Exceptional', color: '#0a7a2d' };
}

// returns net worth change over a selected period of time for large cards
function changeOver(history: NetWorthHistoryPoint[], days: number): Trend {
  const cutoff = Date.now() - days * 86400000;
  const reverse = [...history].reverse();
  const prior = reverse.find((h) => new Date(h.date).getTime() <= cutoff);
  const latest = history[history.length - 1];
  if (!prior || !latest) return null;
  const amount = latest.netWorth - prior.netWorth;
  const percent = prior.netWorth === 0 ? null : (amount / prior.netWorth) * 100;
  return { amount, percent };
}

// renders large card with Trend (type) info
function TrendStat({ label, change }: { label: string; change: Trend }) {
  if (!change) return null;
  const up = change.amount >= 0;
  return (
    <View style={styles.trendCard}>
      <Text style={styles.trendLabel}>{label}</Text>
      <Text style={[styles.trendValue, { color: up ? palette.green : palette.red }]}>
        {up ? '▲' : '▼'} ${change.amount.toFixed(2)}
        {change.percent !== null
          ? ` (${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(1)}%)`
          : ''}
      </Text>
    </View>
  );
}

function rangeStart(range: RangeKey, now: Date): Date | null {
  // History dates are yyyy-MM-dd parsed as UTC midnight, so the cutoff must
  // also land on a UTC day boundary (not now's time-of-day) to avoid dropping
  // the snapshot exactly 7 days out.
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  switch (range) {
    case '1W':
      return new Date(utcNow - 6 * 86400000); // last 7 calendar days including today
    case '1M':
      return new Date(utcNow - 29 * 86400000);
    case '3M':
      return new Date(utcNow - 89 * 86400000);
    case '1Y':
      return new Date(utcNow - 364 * 86400000);
    case 'YTD':
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    case 'ALL':
      return null;
    default:
      throw new Error(`Unknown range: ${range}`);
  }
}

export default function TabOneScreen() {
  const todayString = new Date().toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Formats a yyyy-MM-dd date string in UTC so the displayed day matches the
  // data (parsing "2026-08-06" yields UTC midnight; toLocaleDateString in a
  // local zone would otherwise render the previous day).
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // unpack values from objects/arrays returned from the API and store in named state variables
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inTheGreen, setInTheGreen] = useState<boolean | null>(null);
  const [inTheRed, setInTheRed] = useState<boolean | null>(null);
  const [history, setHistory] = useState<NetWorthHistoryPoint[] | null>(null);
  const [range, setRange] = useState<RangeKey>('ALL');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [totalLiabilities, setTotalLiabilities] = useState<number | null>(null);
  const [creditScore, setCreditScoreState] = useState<number | null>(null);
  const [scoreBoxOpen, setScoreBoxOpen] = useState<boolean>(false);
  const [scoreInput, setScoreInput] = useState<string>('');

  const loadData = useCallback(async () => {
    // Record today's snapshot first so today appears in the history list. This
    // runs on every focus (idempotent day upsert on the backend).
    try {
      await recordNetWorthSnapshot();
    } catch {
      // A failed snapshot shouldn't block the dashboard from loading.
    }
    Promise.all([
      fetchNetWorth()
        .then(setNetWorth)
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : 'Failed to load net worth'),
        )
        .finally(() => setLoading(false)),
      fetchNetWorthHistory()
        .then(setHistory)
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : 'Failed to load net worth history'),
        ),
    ]); // end of Promise.all
    fetchInTheGreen()
      .then(setInTheGreen)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load in the green status'),
      );
    fetchInTheRed()
      .then(setInTheRed)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load in the red status'),
      );
    fetchAccounts()
      .then(setAccounts)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load accounts'),
      );
    fetchTotalAssets()
      .then(setTotalAssets)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load total assets'),
      );
    fetchTotalLiabilities()
      .then(setTotalLiabilities)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load total liabilities'),
      );
    fetchCreditScore()
      .then(setCreditScoreState)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load credit score'),
      );
  }, []);

  // refresh whenever the tab regains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const saveScore = useCallback(async () => {
    const value = Number(scoreInput);
    if (!Number.isInteger(value) || value < 300 || value > 850) return;
    await setCreditScore(value);
    setCreditScoreState(value);
    setScoreBoxOpen(false);
    setScoreInput('');
  }, [scoreInput]);

  // this is a "stock style" day change (information under date)
  // create quotes containing netWorthHistoryPoint, change, and percent change
  // the first element has no change or percent change.
  const fullQuotes: Quote[] = (history ?? []).map((h, i, arr) => {
    const prev = i > 0 ? arr[i - 1] : null; // get previous element
    const change = prev ? h.netWorth - prev.netWorth : null; // calculate change using previous
    const percent =
      change !== null && prev && prev.netWorth !== 0 ? (change / prev.netWorth) * 100 : null; // clalculate percent change
    return { point: h, change, percent };
  });
  const cutoff = rangeStart(range, new Date()); // get cutoff date for selected range
  const filteredQuotes: Quote[] = cutoff
    ? fullQuotes.filter((q) => new Date(q.point.date) >= cutoff)
    : fullQuotes;
  // show the full filtered range, newest first.
  const preview: Quote[] = [...filteredQuotes].reverse();
  const _1m = changeOver(history ?? [], 30);
  const _1y = changeOver(history ?? [], 365);
  // Backend treats credit cards and loans as liabilities, so total assets only
  // sums the remaining (asset) accounts.
  const totalAssetsFromAccounts = accounts
    .filter((a) => a.accType !== 'CREDIT_CARD' && a.accType !== 'LOAN')
    .reduce((sum, a) => sum + a.balance, 0);
  const debt = accounts.filter((a) => a.accType === 'CREDIT_CARD' || a.accType === 'LOAN');
  const investments = accounts.filter((a) => a.accType === 'INVESTMENT');

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Could not load Portfolio: {error}</Text>
      </View>
    );
  }

  if (loading || netWorth === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#98989d" style={styles.loading} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. header + as-of */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Net Worth</Text>
        <Text style={styles.asOf}>{' as of ' + todayString}</Text>
      </View>

      {/* 2. value + arrow */}
      <View style={styles.valueRow}>
        <Text style={styles.value}>${netWorth.toFixed(2)}</Text>
        {inTheGreen ? (
          <Text style={styles.arrowUp}>▲</Text>
        ) : inTheRed ? (
          <Text style={styles.arrowDown}>▼</Text>
        ) : null}
      </View>

      {/* 3. trend stats row */}
      <View style={styles.trendRow}>
        <TrendStat label="1M" change={_1m} />
        <TrendStat label="1Y" change={_1y} />
      </View>

      {/* 4. History — its own bounded FlatList */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>History</Text>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={[styles.rangeButton, range === r && styles.rangeButtonActive]}
            >
              <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.historyBox}>
        <FlatList
          data={preview}
          keyExtractor={(q) => String(q.point.id)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            // item is a Quote (point(id, netWorth, date), change, percent)
            const up = (item.change ?? 0) >= 0;
            return (
              <View style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{formatDate(item.point.date)}</Text>
                  {item.change !== null && (
                    <Text
                      style={[styles.historyChange, { color: up ? palette.green : palette.red }]}
                    >
                      {up ? '+' : '-'}${Math.abs(item.change).toFixed(2)}
                      {item.percent !== null
                        ? ` (${up ? '+' : '-'}${Math.abs(item.percent).toFixed(2)}%)`
                        : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.historyRight}>
                  {item.change !== null && (
                    <Text
                      style={[styles.historyArrow, { color: up ? palette.green : palette.red }]}
                    >
                      {up ? '▲' : '▼'}
                    </Text>
                  )}
                  <Text style={styles.historyAmount}>${item.point.netWorth.toFixed(2)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No history yet.</Text>}
        />
      </View>
      <View style={styles.accounts}>
        <Text style={styles.accountMix}>Account Mix</Text>
        <View style={styles.mixTotalsRow}>
          <View style={styles.trendCard}>
            <Text style={styles.trendLabel}>Total Assets</Text>
            <Text style={styles.trendValue}>
              ${(totalAssets ?? totalAssetsFromAccounts).toFixed(2)}
            </Text>
          </View>
          <View style={styles.trendCard}>
            <Text style={styles.trendLabel}>Total Liabilities</Text>
            <Text style={styles.trendValue}>${(totalLiabilities ?? 0).toFixed(2)}</Text>
          </View>
        </View>
        {accounts.length === 0 ? (
          <Text style={styles.empty}>No accounts yet.</Text>
        ) : (
          <View style={styles.mixGrid}>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                percent={
                  totalAssetsFromAccounts > 0 ? account.balance / totalAssetsFromAccounts : 0
                }
              />
            ))}
          </View>
        )}
      </View>
      <View>
        <Text style={[styles.accountMix, styles.sectionOffset]}>Debt Overview</Text>
        {accounts.length === 0 || debt.length === 0 ? (
          <Text style={styles.empty}>No outstanding debt.</Text>
        ) : (
          debt.map((account) => <AccountCard key={account.id} account={account} />)
        )}
      </View>
      <View>
        <Text style={[styles.accountMix, styles.sectionOffset]}>Investments (projection)</Text>
        {accounts.length === 0 || investments.length === 0 ? (
          <Text style={styles.empty}>No Investment accounts.</Text>
        ) : (
          investments.map((account) => <AccountCard key={account.id} account={account} />)
        )}
      </View>
      <View>
        <View style={[styles.creditScoreTitleRow, styles.sectionOffset]}>
          <Text style={styles.accountMix}>Credit Score</Text>
          <Pressable onPress={() => setScoreBoxOpen(true)}>
            <Text style={styles.creditScoreEdit}>Edit</Text>
          </Pressable>
        </View>
        {creditScore === null || creditScore === 0 ? (
          <Pressable onPress={() => setScoreBoxOpen(true)}>
            <Text style={styles.empty}>Tap to add credit score.</Text>
          </Pressable>
        ) : (
          <View style={styles.creditScoreRow}>
            <Text style={styles.creditScoreNumber}>{creditScore}</Text>
            <Text style={[styles.creditScoreLabel, { color: creditRating(creditScore).color }]}>
              {creditRating(creditScore).label}
            </Text>
          </View>
        )}
      </View>
      <Modal
        visible={scoreBoxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScoreBoxOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Credit Score</Text>
            <TextInput
              style={styles.input}
              value={scoreInput}
              onChangeText={setScoreInput}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="300-850"
              placeholderTextColor="#98989d"
              autoFocus
            />
            <View style={styles.dialogButtons}>
              <PhoneButton onPress={() => setScoreBoxOpen(false)} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancel</Text>
              </PhoneButton>
              <PhoneButton onPress={() => saveScore()} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Save</Text>
              </PhoneButton>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  title: {
    fontFamily: sans,
    fontSize: 32,
    fontWeight: '700',
    color: palette.text,
  },
  asOf: {
    fontFamily: sans,
    fontSize: 13,
    color: palette.textDim,
    marginBottom: 4,
    marginLeft: 4,
  },
  value: {
    fontFamily: sans,
    fontSize: 58,
    fontWeight: '700',
    color: palette.text,
    marginTop: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowUp: {
    color: palette.green,
    fontSize: 12,
    marginBottom: 24,
    marginLeft: -6,
  },
  arrowDown: {
    color: palette.red,
    fontSize: 12,
    marginBottom: 24,
    marginLeft: -6,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  trendCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
    borderRadius: 14,
  },
  trendLabel: {
    fontFamily: sans,
    fontSize: 11,
    letterSpacing: 1.5,
    color: palette.textDim,
    textTransform: 'uppercase',
  },
  trendValue: {
    fontFamily: sans,
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginTop: 6,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 36,
  },
  rangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rangeButtonActive: {
    backgroundColor: palette.surfaceAlt,
  },
  rangeText: {
    fontFamily: sans,
    fontSize: 12,
    color: palette.textDim,
  },
  rangeTextActive: {
    color: palette.text,
    fontWeight: '600',
  },
  historyTitle: {
    fontFamily: sans,
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  historyBox: {
    marginTop: 8,
    maxHeight: 435,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  historyLeft: {
    flexDirection: 'column',
  },
  historyDate: {
    fontFamily: sans,
    fontSize: 14,
    color: palette.text,
  },
  historyChange: {
    fontFamily: sans,
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyArrow: {
    fontFamily: sans,
    fontSize: 12,
    marginRight: 6,
  },
  historyAmount: {
    fontFamily: sans,
    fontSize: 14,
    color: palette.text,
    fontWeight: '600',
  },
  empty: {
    fontFamily: sans,
    color: palette.textDim,
    fontStyle: 'italic',
    padding: 24,
    textAlign: 'center',
  },
  loading: {
    marginTop: 24,
  },
  error: {
    fontFamily: sans,
    color: palette.red,
    marginTop: 12,
  },
  accounts: {
    marginTop: 28,
  },
  accountMix: {
    fontFamily: sans,
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 10,
  },
  sectionOffset: {
    marginTop: 12,
  },
  mixTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  mixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  creditScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  creditScoreNumber: {
    fontFamily: sans,
    fontSize: 48,
    fontWeight: '700',
    color: palette.text,
  },
  creditScoreLabel: {
    fontFamily: sans,
    fontSize: 19,
    fontWeight: '600',
  },
  creditScoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
  },
  creditScoreEdit: {
    fontFamily: sans,
    fontSize: 12,
    color: palette.blue,
    marginTop: -2,
    marginLeft: -2,
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
    maxWidth: 320,
    height: 320,
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
    fontSize: 28,
    color: palette.text,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    textAlign: 'center',
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
