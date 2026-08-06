import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import NetWorthChart from '@/components/NetWorthChart';
import { Text, View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { fetchNetWorth, fetchNetWorthHistory } from '@/lib/api';
import type { NetWorthHistoryPoint } from '@/types/NetWorth';

export type RangeKey = '1W' | '1M' | '3M' | '1Y' | 'YTD' | 'ALL';

const RANGES: RangeKey[] = ['1W', '1M', '3M', '1Y', 'YTD', 'ALL'];

const RANGE_POINTS: Record<RangeKey, number> = {
  '1W': 7, // 7 days, one point per day
  '1M': 31, // 1 month back, split into 31 points
  '3M': 12, // 3 months back, split into 12 points
  '1Y': 12, // 1 year back, monthly
  YTD: 12, // year to date, monthly
  ALL: 0, // every recorded point
};

function windowStart(range: RangeKey, now: Date): Date | null {
  switch (range) {
    case '1W': {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      return d;
    }
    case '1M': {
      const d = new Date(now);
      d.setMonth(now.getMonth() - 1);
      return d;
    }
    case '3M': {
      const d = new Date(now);
      d.setMonth(now.getMonth() - 3);
      return d;
    }
    case '1Y': {
      const d = new Date(now);
      d.setFullYear(now.getFullYear() - 1);
      return d;
    }
    case 'YTD':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

/**
 * Takes the windowed points (ascending) and, if more than `count`, returns one
 * point per evenly-spaced time bucket across the window so the series is spread
 * over the whole selected range.
 */
function bucket(points: NetWorthHistoryPoint[], count: number): NetWorthHistoryPoint[] {
  if (count <= 0 || points.length <= count) return points;

  const start = new Date(points[0].date).getTime();
  const end = new Date(points[points.length - 1].date).getTime();
  const span = end - start;

  const result: NetWorthHistoryPoint[] = [];
  let currentBucket = -1;

  for (const point of points) {
    const t = new Date(point.date).getTime();
    // Guard against all points sharing the same timestamp (span === 0): fall
    // back to a span of 1 so the first point is still kept instead of NaN.
    const safeSpan = span || 1;
    const bucketIndex = Math.floor(((t - start) / safeSpan) * count);
    if (bucketIndex > currentBucket) {
      result.push(point);
      currentBucket = bucketIndex;
    }
  }

  return result;
}

function filterHistory(data: NetWorthHistoryPoint[], range: RangeKey): NetWorthHistoryPoint[] {
  if (data.length === 0) return data;

  const cutoff = windowStart(range, new Date());
  const windowed = cutoff ? data.filter((d) => new Date(d.date) >= cutoff!) : data;
  return bucket(windowed, RANGE_POINTS[range]);
}

export default function TabOneScreen() {
  const todayString = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [displayWorth, setDisplayWorth] = useState<number | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(todayString);
  const [history, setHistory] = useState<NetWorthHistoryPoint[]>([]);
  const [range, setRange] = useState<RangeKey>('1M');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(() => {
    Promise.all([fetchNetWorth(), fetchNetWorthHistory()])
      .then(([worth, hist]) => {
        setNetWorth(worth);
        setDisplayWorth(worth);
        setHistory(hist);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load net worth')
      )
      .finally(() => setLoading(false));
  }, []);

  // Refetch whenever the tab regains focus so the numbers stay fresh (e.g.
  // after adding an account on the Accounts tab). The spinner only shows on
  // the first load; later focus refetches update silently.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const visibleHistory = useMemo(() => filterHistory(history, range), [history, range]);
  const latestVisible = visibleHistory[visibleHistory.length - 1]?.netWorth ?? netWorth;

  const handleSelect = (p: NetWorthHistoryPoint | null) => {
    setDisplayWorth(p ? p.netWorth : latestVisible);
    setAsOfDate(p ? formatDate(p.date) : todayString);
  };

  const handleRangeChange = (r: RangeKey) => {
    setRange(r);
    const filtered = filterHistory(history, r);
    setDisplayWorth(filtered[filtered.length - 1]?.netWorth ?? netWorth);
    setAsOfDate(filtered.length
      ? formatDate(filtered[filtered.length - 1].date)
      : todayString);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Net Worth</Text>
        <Text style={styles.asOf}>{" as of " + asOfDate}</Text>
      </View>

      {error ? <Text style={styles.error}>Could not load net worth: {error}</Text> : null}

      {loading ? (
        <ActivityIndicator color="#98989d" style={styles.loading} />
      ) : (
        <>
          {displayWorth !== null ? (
            <Text style={styles.value}>${displayWorth.toFixed(2)}</Text>
          ) : null}
          <View style={styles.chartWrap}>
            <NetWorthChart data={visibleHistory} onSelect={handleSelect} />
          </View>
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <Pressable
                key={r}
                onPress={() => handleRangeChange(r)}
                style={[styles.rangeButton, range === r && styles.rangeButtonActive]}>
                <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
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
    marginTop: 6,
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
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  chartWrap: {
    marginTop: 24,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
    paddingRight: 44,
  },
  rangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  rangeButtonActive: {
    backgroundColor: '#1c1c1e',
    borderRadius: 6,
  },
  rangeText: {
    fontFamily: serif,
    fontSize: 13,
    color: '#98989d',
  },
  rangeTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loading: {
    marginTop: 24,
  },
  error: {
    fontFamily: serif,
    color: '#ff6b6b',
    marginTop: 12,
  },
});
