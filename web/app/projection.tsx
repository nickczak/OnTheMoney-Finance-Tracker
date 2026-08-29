import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import type { SymbolViewProps } from 'expo-symbols';

import { Text, View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { CONTENT_MAX_WIDTH, useResponsiveLayout } from '@/constants/responsive';
import { fetchTotalAssets, projectRetirement } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Projection } from '@/types/Projection';

// Icon-labeled text input row (used for all five projection fields).
function Field({
  icon,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  icon: SymbolViewProps['name'];
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'decimal-pad' | 'number-pad';
  placeholder: string;
}) {
  return (
    <View style={styles.inputRow}>
      <View style={styles.inputIcon}>
        <SymbolView name={icon} tintColor="#98989d" size={24} />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#98989d"
      />
    </View>
  );
}

// Line chart of the four projection trajectories (one value per year).
// Series are normalized to a shared Y scale so the paths stay comparable.
function ProjLineChart({ result }: { result: Projection }) {
  const { scale } = useResponsiveLayout();
  const width = 340 * scale; // chart width in points
  const height = 220;
  const pad = 8; // breathing room at the top so the best line doesn't clip

  // The trajectory arrays are aligned by index = year 1..N, all starting from
  // the same initial balance, so we can just max across all of them.
  const series = [
    { data: result.worst10Trajectory, color: '#ff6b6b' },
    { data: result.medianTrajectory, color: '#ffcc00' },
    { data: result.meanTrajectory, color: '#98989d' },
    { data: result.best10Trajectory, color: '#00ff88' },
  ];

  const allValues = series.flatMap((s) => s.data);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues, 0);
  const n = Math.max(series[0].data.length, 1);

  // Map a (year index, value) to a point in the SVG viewBox coordinate space.
  // X runs 0..width across the years; Y is value scaled between min and max.
  const point = (i: number, v: number) => {
    const x = (i / (n - 1)) * width;
    const y = height - pad - ((v - minVal) / (maxVal - minVal || 1)) * (height - pad * 2);
    return `${x},${y}`;
  };

  const toPolyline = (data: number[]) => data.map((v, i) => point(i, v)).join(' ');

  // Tick positions along each axis (0 / 25 / 50 / 75 / 100% of the range).
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  // Year labels along the x-axis (trajectories span year 0 .. result.years).
  const xTicks = ticks.map((f) => Math.round(result.years * f));

  return (
    <View style={styles.chartArea}>
      <View style={styles.chartRow}>
        <View style={styles.chartWrap}>
          <Svg width={width} height={height}>
            {ticks.map((g) => {
              const y = height - pad - g * (height - pad * 2);
              return (
                <Line key={g} x1={0} y1={y} x2={width} y2={y} stroke="#2c2c2e" strokeWidth={1} />
              );
            })}
            {series.map((s) => (
              <Polyline
                key={s.color}
                points={toPolyline(s.data)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
              />
            ))}
          </Svg>
        </View>
      </View>
      {/* x-axis year numbers under the chart */}
      <View style={styles.axisXRow}>
        {xTicks.map((y) => (
          <Text key={y} style={styles.axisXTick}>
            {y}
          </Text>
        ))}
      </View>
      <Text style={styles.axisXLabel}>Year</Text>
    </View>
  );
}

export default function ProjectionScreen() {
  const { scale, height, isDesktop } = useResponsiveLayout();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Projection | null>(null);
  const [initial, setInitial] = useState<string>('10000');
  const [contribution, setContribution] = useState<string>('500');
  const [rate, setRate] = useState<string>('7');
  const [years, setYears] = useState<string>('30');
  const [sims, setSims] = useState<string>('10000');

  // Default the initial balance to the user's current total assets.
  useEffect(() => {
    fetchTotalAssets()
      .then((t) => {
        if (t > 0) setInitial(String(t));
      })
      .catch(() => {
        // Keep the $10,000 default if total assets can't be loaded.
      });
  }, []);

  const run = useCallback(async () => {
    const initialBalance = Number(initial);
    const monthlyContribution = Number(contribution);
    const returnRate = Number(rate);
    const yearsNum = Number(years);
    const simulations = Number(sims);
    if (
      !Number.isFinite(initialBalance) ||
      !Number.isFinite(monthlyContribution) ||
      !Number.isFinite(returnRate) ||
      !Number.isInteger(yearsNum) ||
      yearsNum <= 0 ||
      !Number.isInteger(simulations) ||
      simulations <= 0 ||
      simulations > 100000
    ) {
      setFormError(
        'Check your inputs: years & simulations must be whole numbers, and simulations ≤ 100000.',
      );
      return;
    }
    setFormError(null);
    setLoading(true);
    setError(null);
    try {
      const proj = await projectRetirement({
        initialBalance,
        monthlyContribution,
        returnRate,
        years: yearsNum,
        simulations,
      });
      setResult(proj);
    } catch (err) {
      setError(
        `Projection failed (${err instanceof Error ? err.message : 'unknown error'}). ` +
          'The C++ engine must be built and running.',
      );
    } finally {
      setLoading(false);
    }
  }, [initial, contribution, rate, years, sims]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentWide]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { fontSize: 28 * scale }]}>Retirement Projection</Text>
      <Text style={styles.subtitle}>
        Runs thousands of random market simulations to project your retirement savings.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result ? (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Projected balance after {result.years} years</Text>
          <ProjLineChart result={result} />
          <View style={styles.resultsRow}>
            <View style={styles.statCard}>
              <Text style={styles.trendLabel}>Worst 10%</Text>
              <Text
                style={[styles.trendValue, { color: '#ff6b6b' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                ${formatMoney(result.worst10)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.trendLabel}>Median</Text>
              <Text
                style={[styles.trendValue, { color: '#ffcc00' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                ${formatMoney(result.median)}
              </Text>
            </View>
          </View>
          <View style={styles.resultsRow}>
            <View style={styles.statCard}>
              <Text style={styles.trendLabel}>Best 10%</Text>
              <Text
                style={[styles.trendValue, { color: '#00ff88' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                ${formatMoney(result.best10)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.trendLabel}>Mean</Text>
              <Text
                style={[styles.trendValue, { color: '#fff' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                ${formatMoney(result.mean)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={[styles.formCard, { height: Math.min(470, height * 0.85) }]}>
        <Field
          icon={{ ios: 'dollarsign.circle.fill', android: 'payments', web: 'payments' }}
          value={initial}
          onChangeText={setInitial}
          keyboardType="decimal-pad"
          placeholder="Initial balance"
        />
        <Field
          icon={{ ios: 'arrow.up.right.circle.fill', android: 'add_circle', web: 'add_circle' }}
          value={contribution}
          onChangeText={setContribution}
          keyboardType="decimal-pad"
          placeholder="Monthly contribution"
        />
        <Field
          icon={{ ios: 'percent', android: 'percent', web: 'percent' }}
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
          placeholder="Return rate % (e.g. 7)"
        />
        <Field
          icon={{ ios: 'calendar', android: 'event', web: 'event' }}
          value={years}
          onChangeText={setYears}
          keyboardType="number-pad"
          placeholder="Years (e.g. 30)"
        />
        <Field
          icon={{ ios: 'number', android: 'tag', web: 'tag' }}
          value={sims}
          onChangeText={setSims}
          keyboardType="number-pad"
          placeholder="Simulations (≤ 100000)"
        />
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <Pressable
          onPress={() => run()}
          style={({ pressed }) => [styles.runButton, pressed && styles.runButtonPressed]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.runButtonText}>Run Projection</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
  },
  // Desktop: center the screen's content in the shared content column.
  contentWide: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: serif,
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontFamily: serif,
    fontSize: 14,
    color: '#98989d',
    marginTop: 6,
    marginBottom: 20,
  },
  formCard: {
    borderWidth: 1,
    borderColor: '#fff',
    padding: 20,
    justifyContent: 'space-between',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputIcon: {
    marginTop: -18,
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
    maxWidth: 320,
  },
  formError: {
    fontFamily: serif,
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  runButton: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
  },
  runButtonPressed: {
    backgroundColor: '#1a1a1a',
  },
  runButtonText: {
    fontFamily: serif,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#fff',
  },
  error: {
    fontFamily: serif,
    color: '#ff6b6b',
    marginTop: 16,
  },
  results: {
    marginTop: 24,
  },
  resultsTitle: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fff',
    padding: 14,
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
  chartArea: {
    marginTop: 16,
    marginBottom: 24,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  chartWrap: {
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 8,
    alignItems: 'center',
  },
  // Row of year numbers under the plot, aligned to the chart's width.
  axisXRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingLeft: 2,
  },
  axisXTick: {
    fontFamily: serif,
    fontSize: 10,
    color: '#98989d',
  },
  axisXLabel: {
    fontFamily: serif,
    fontSize: 11,
    fontStyle: 'italic',
    color: '#98989d',
    marginTop: 4,
    textAlign: 'center',
  },
});
