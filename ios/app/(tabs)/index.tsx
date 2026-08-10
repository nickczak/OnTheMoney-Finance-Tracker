import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import AccountCard from '@/components/AccountCard';
import { serif } from '@/constants/Colors';
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
} from '@/lib/api';
import type { NetWorthHistoryPoint } from '@/types/NetWorth';
import type { Account } from '@/types/Account';

type Trend = { amount: number; percent: number | null } | null;
type Quote = { point: NetWorthHistoryPoint; change: number | null; percent: number | null };
export type RangeKey = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
const RANGES: RangeKey[] = ['1W', '1M', '3M', '1Y', 'YTD', 'ALL'];

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
      <Text style={[styles.trendValue, { color: up ? '#00ff88' : '#ff6b6b' }]}>
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
                    <Text style={[styles.historyChange, { color: up ? '#00ff88' : '#ff6b6b' }]}>
                      {up ? '+' : '-'}${Math.abs(item.change).toFixed(2)}
                      {item.percent !== null
                        ? ` (${up ? '+' : '-'}${Math.abs(item.percent).toFixed(2)}%)`
                        : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.historyRight}>
                  {item.change !== null && (
                    <Text style={[styles.historyArrow, { color: up ? '#00ff88' : '#ff6b6b' }]}>
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
        <Text style={styles.accountMix}>Debt Overview</Text>
        {accounts.length === 0 || debt.length === 0 ? (
          <Text style={styles.empty}>No outstanding debt.</Text>
        ) : (
          <View style={styles.mixGrid}>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                percent={
                  account.balance // display account balance instead of percent
                }
              />
            ))}
          </View>
        )}
      </View>
      <View>
        <Text style={styles.accountMix}>Investments (projection)</Text>
        {accounts.length === 0 || investments.length === 0 ? (
          <Text style={styles.empty}>No Investment accounts.</Text>
        ) : (
          <View style={styles.mixGrid}>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                percent={
                  account.balance // display account balance instead of percent
                }
              />
            ))}
          </View>
        )}
      </View>
      <View>
        <Text style={styles.accountMix}>Credit Score</Text>
        {creditScore === null ? (
          <Text style={styles.empty}>Tap to add credit score.</Text>
        ) : (
          (() => {
            const ratio = Math.min(100, Math.max(0, ((creditScore - 300) / 550) * 100));
            return (
              <View style={styles.creditScoreBox}>
                <View style={styles.creditScoreRow}>
                  <Text style={styles.creditScoreNumber}>{creditScore}</Text>
                  <View style={styles.creditMeter}>
                    <View style={styles.creditMeterBar}>
                      <View style={[styles.creditMeterSegment, { backgroundColor: '#ff3b30' }]} />
                      <View style={[styles.creditMeterSegment, { backgroundColor: '#ff9500' }]} />
                      <View style={[styles.creditMeterSegment, { backgroundColor: '#ffcc00' }]} />
                      <View style={[styles.creditMeterSegment, { backgroundColor: '#34c759' }]} />
                      <View style={[styles.creditMeterSegment, { backgroundColor: '#0a7a2d' }]} />
                    </View>
                    <View style={[styles.creditMeterMarker, { left: `${ratio}%` }]} />
                  </View>
                </View>
              </View>
            );
          })()
        )}
      </View>
    </ScrollView>
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
    gap: 36,
  },
  rangeButton: {
    paddingVertical: 6,
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
  creditScoreBox: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
  },
  creditScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditScoreNumber: {
    fontFamily: serif,
    fontSize: 44,
    fontWeight: '700',
    color: '#fff',
  },
  creditMeter: {
    flex: 0.6,
    height: 16,
    justifyContent: 'center',
  },
  creditMeterBar: {
    flexDirection: 'row',
    gap: 12,
    height: 6,
    borderRadius: 3,
  },
  creditMeterSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  creditMeterMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    marginLeft: -8,
  },
});
