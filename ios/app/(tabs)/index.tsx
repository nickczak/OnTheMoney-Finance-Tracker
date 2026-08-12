import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Modal, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import AccountCard from '@/components/AccountCard';
import { serif } from '@/constants/Colors';
import { useResponsiveLayout } from '@/constants/responsive';
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
import { formatMoney } from '@/lib/format';
import type { NetWorthHistoryPoint } from '@/types/NetWorth';
import type { Account } from '@/types/Account';

type Trend = { amount: number; percent: number | null } | null;
type Quote = { point: NetWorthHistoryPoint; change: number | null; percent: number | null };
export type RangeKey = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
const RANGES: RangeKey[] = ['1W', '1M', '3M', '1Y', 'YTD', 'ALL'];

function creditRating(score: number): { label: string; color: string } {
  if (score < 580) return { label: 'Poor', color: '#ff3b30' };
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
  const { scale } = useResponsiveLayout();
  if (!change) return null;
  const up = change.amount >= 0;
  return (
    <View style={styles.trendCard}>
      <Text style={styles.trendLabel}>{label}</Text>
      <Text
        style={[styles.trendValue, { fontSize: 17 * scale }, { color: up ? '#00ff88' : '#ff6b6b' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {up ? '▲' : '▼'} ${formatMoney(change.amount)}
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
  const router = useRouter();
  const { scale, height } = useResponsiveLayout();
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
  // Measured width of the Total Assets / Total Liabilities row, used to size
  // the account-mix tiles so the three tiles span the same width as those two
  // boxes together (see AccountCard's tileWidth prop).
  const [totalsRowWidth, setTotalsRowWidth] = useState<number | null>(null);

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
    <FlatList
      style={styles.container}
      data={[0]}
      keyExtractor={() => 'page'}
      showsVerticalScrollIndicator={false}
      renderItem={() => (
        <>
          {/* 1. header + as-of */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { fontSize: 34 * scale, flexShrink: 1 }]} numberOfLines={1}>
              Net Worth
            </Text>
            <Text
              style={[styles.asOf, { fontSize: 15 * scale, flexShrink: 1 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {' as of ' + todayString}
            </Text>
          </View>

          {/* 2. value + arrow */}
          <View style={styles.valueRow}>
            <Text
              style={[styles.value, { fontSize: 64 * scale }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              ${formatMoney(netWorth)}
            </Text>
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
                  <Text
                    style={[
                      styles.rangeText,
                      { fontSize: 12 * scale },
                      range === r && styles.rangeTextActive,
                    ]}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.historyBox, { maxHeight: Math.min(height * 0.45, 435) }]}>
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
                      <Text
                        style={[styles.historyDate, { fontSize: 15 * scale }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {formatDate(item.point.date)}
                      </Text>
                      {item.change !== null && (
                        <Text
                          style={[
                            styles.historyChange,
                            { fontSize: 12 * scale },
                            { color: up ? '#00ff88' : '#ff6b6b' },
                          ]}
                        >
                          {up ? '+' : '-'}${formatMoney(Math.abs(item.change))}
                          {item.percent !== null
                            ? ` (${up ? '+' : '-'}${Math.abs(item.percent).toFixed(2)}%)`
                            : ''}
                        </Text>
                      )}
                    </View>
                    <View style={styles.historyRight}>
                      {item.change !== null && (
                        <Text
                          style={[
                            styles.historyArrow,
                            { fontSize: 12 * scale },
                            { color: up ? '#00ff88' : '#ff6b6b' },
                          ]}
                        >
                          {up ? '▲' : '▼'}
                        </Text>
                      )}
                      <Text
                        style={[styles.historyAmount, { fontSize: 15 * scale, flexShrink: 1 }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        ${formatMoney(item.point.netWorth)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No history yet.</Text>}
            />
          </View>
          <View style={styles.accounts}>
            <Text style={styles.accountMix}>Account Mix</Text>
            <View
              style={styles.mixTotalsRow}
              onLayout={(e) => setTotalsRowWidth(e.nativeEvent.layout.width)}
            >
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Total Assets</Text>
                <Text
                  style={styles.trendValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  ${formatMoney(totalAssets ?? totalAssetsFromAccounts)}
                </Text>
              </View>
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Total Liabilities</Text>
                <Text
                  style={styles.trendValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  ${formatMoney(totalLiabilities ?? 0)}
                </Text>
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
                    tileWidth={totalsRowWidth !== null ? (totalsRowWidth - 24) / 3 : undefined}
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
            <View style={[styles.investHeader, styles.sectionOffset]}>
              <Text style={styles.accountMix}>Investments</Text>
              <Pressable
                onPress={() => router.push('/projection')}
                hitSlop={8}
                style={styles.projButton}
              >
                <Text style={styles.projButtonText}>Projections</Text>
              </Pressable>
            </View>
            {accounts.length === 0 || investments.length === 0 ? (
              <Text style={styles.empty}>No Investment accounts.</Text>
            ) : (
              investments.map((account) => <AccountCard key={account.id} account={account} />)
            )}
          </View>
          <View>
            <View style={[styles.creditScoreTitleRow, styles.sectionOffset]}>
              <Text style={styles.accountMix}>Credit Score</Text>
              <Pressable
                onPress={() => setScoreBoxOpen(true)}
                hitSlop={10}
                style={styles.creditScorePencil}
              >
                <SymbolView
                  name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                  tintColor="#98989d"
                  size={14}
                />
              </Pressable>
            </View>
            {creditScore === null || creditScore === 0 ? (
              <Pressable onPress={() => setScoreBoxOpen(true)}>
                <Text style={styles.empty}>Tap to add credit score.</Text>
              </Pressable>
            ) : (
              <View style={styles.creditScoreCard}>
                <View style={styles.creditScoreRow}>
                  <Text style={[styles.creditScoreNumber, { fontSize: 40 * scale }]}>
                    {creditScore}
                  </Text>
                  <View style={styles.creditScoreRating}>
                    <View
                      style={[
                        styles.creditScoreDot,
                        { backgroundColor: creditRating(creditScore).color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.creditScoreRatingText,
                        { fontSize: 22 * scale },
                        { color: creditRating(creditScore).color },
                      ]}
                    >
                      {creditRating(creditScore).label}
                    </Text>
                  </View>
                </View>
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
              <View style={[styles.dialog, { height: Math.min(320, height * 0.72) }]}>
                <Text style={styles.dialogTitle}>Credit Score</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <SymbolView
                      name={{ ios: 'gauge', android: 'speed', web: 'speed' }}
                      tintColor="#98989d"
                      size={24}
                    />
                  </View>
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
                </View>
                <View style={styles.dialogButtons}>
                  <Pressable style={styles.dialogButton} onPress={() => setScoreBoxOpen(false)}>
                    <Text style={styles.dialogButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.dialogButton} onPress={() => saveScore()}>
                    <Text style={styles.dialogButtonText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -16,
  },
  title: {
    fontFamily: serif,
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
  },
  asOf: {
    fontFamily: serif,
    fontSize: 15,
    color: '#98989d',
    marginBottom: 4,
    marginLeft: 4,
  },
  value: {
    fontFamily: serif,
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowUp: {
    color: '#00ff88',
    fontSize: 12,
    marginBottom: 24,
    marginLeft: -6,
  },
  arrowDown: {
    color: '#ff6b6b',
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
    borderColor: '#fff',
    padding: 14,
    borderRadius: 0,
  },
  trendLabel: {
    fontFamily: serif,
    fontSize: 13,
    letterSpacing: 1.5,
    color: '#98989d',
    textTransform: 'uppercase',
  },
  trendValue: {
    fontFamily: serif,
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginTop: 6,
  },
  rangeRow: {
    flexDirection: 'row',
    flex: 1,
    flexShrink: 1,
    justifyContent: 'space-between',
  },
  rangeButton: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 0,
  },
  rangeButtonActive: {
    backgroundColor: '#1c1c1e',
  },
  rangeText: {
    fontFamily: serif,
    fontSize: 12,
    color: '#98989d',
  },
  rangeTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  historyTitle: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
    borderColor: '#2c2c2e',
    borderRadius: 0,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
    backgroundColor: '#000',
  },
  historyLeft: {
    flexDirection: 'column',
    flexShrink: 1,
  },
  historyDate: {
    fontFamily: serif,
    fontSize: 15,
    color: '#d0d0d0',
  },
  historyChange: {
    fontFamily: serif,
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyArrow: {
    fontFamily: serif,
    fontSize: 12,
    marginRight: 6,
  },
  historyAmount: {
    fontFamily: serif,
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  empty: {
    fontFamily: serif,
    color: '#98989d',
    fontStyle: 'italic',
    padding: 24,
    textAlign: 'center',
  },
  loading: {
    marginTop: 24,
  },
  error: {
    fontFamily: serif,
    color: '#ff6b6b',
    marginTop: 12,
  },
  accounts: {
    marginTop: 28,
  },
  accountMix: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
    justifyContent: 'flex-start',
  },
  investHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projButton: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  projButtonText: {
    fontFamily: serif,
    fontSize: 13,
    letterSpacing: 1,
    color: '#fff',
  },
  creditScoreCard: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 14,
    marginVertical: 6,
  },
  creditScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  creditScoreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  creditScoreNumber: {
    fontFamily: serif,
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  creditScoreRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditScoreRatingText: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '600',
  },
  creditScoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
  },
  creditScorePencil: {
    marginTop: -12,
    marginLeft: -6,
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
    height: 320,
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
  input: {
    flex: 1,
    fontFamily: serif,
    fontSize: 20,
    color: '#fff',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    textAlign: 'left',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
    maxWidth: 260,
  },
  inputIcon: {
    marginTop: -18,
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
