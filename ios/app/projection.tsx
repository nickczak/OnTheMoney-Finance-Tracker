import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { useResponsiveLayout } from '@/constants/responsive';
import { fetchTotalAssets, projectRetirement } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Projection } from '@/types/Projection';

// horizontal bar showing one projection outcome relative to the best case
function ProjBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 2;
  return (
    <View style={styles.projBarRow}>
      <Text style={styles.projBarLabel}>{label}</Text>
      <View style={styles.projBarTrack}>
        <View style={[styles.projBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function ProjectionScreen() {
  const { scale, height } = useResponsiveLayout();
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { fontSize: 28 * scale }]}>Retirement Projection</Text>
      <Text style={styles.subtitle}>
        Runs thousands of random market simulations to project your retirement savings.
      </Text>

      <View style={[styles.formCard, { height: Math.min(470, height * 0.85) }]}>
        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <SymbolView
              name={{ ios: 'dollarsign.circle.fill', android: 'payments', web: 'payments' }}
              tintColor="#98989d"
              size={24}
            />
          </View>
          <TextInput
            style={styles.input}
            value={initial}
            onChangeText={setInitial}
            keyboardType="decimal-pad"
            placeholder="Initial balance"
            placeholderTextColor="#98989d"
          />
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <SymbolView
              name={{ ios: 'arrow.up.right.circle.fill', android: 'add_circle', web: 'add_circle' }}
              tintColor="#98989d"
              size={24}
            />
          </View>
          <TextInput
            style={styles.input}
            value={contribution}
            onChangeText={setContribution}
            keyboardType="decimal-pad"
            placeholder="Monthly contribution"
            placeholderTextColor="#98989d"
          />
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <SymbolView
              name={{ ios: 'percent', android: 'percent', web: 'percent' }}
              tintColor="#98989d"
              size={24}
            />
          </View>
          <TextInput
            style={styles.input}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder="Return rate % (e.g. 7)"
            placeholderTextColor="#98989d"
          />
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <SymbolView
              name={{ ios: 'calendar', android: 'event', web: 'event' }}
              tintColor="#98989d"
              size={24}
            />
          </View>
          <TextInput
            style={styles.input}
            value={years}
            onChangeText={setYears}
            keyboardType="number-pad"
            placeholder="Years (e.g. 30)"
            placeholderTextColor="#98989d"
          />
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputIcon}>
            <SymbolView
              name={{ ios: 'number', android: 'tag', web: 'tag' }}
              tintColor="#98989d"
              size={24}
            />
          </View>
          <TextInput
            style={styles.input}
            value={sims}
            onChangeText={setSims}
            keyboardType="number-pad"
            placeholder="Simulations (≤ 100000)"
            placeholderTextColor="#98989d"
          />
        </View>
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result ? (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Projected balance after {result.years} years</Text>
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
          <View style={styles.projBars}>
            <ProjBar label="Worst" value={result.worst10} max={result.best10} color="#ff6b6b" />
            <ProjBar label="Median" value={result.median} max={result.best10} color="#ffcc00" />
            <ProjBar label="Mean" value={result.mean} max={result.best10} color="#98989d" />
            <ProjBar label="Best" value={result.best10} max={result.best10} color="#00ff88" />
          </View>
          <Text style={styles.meta}>
            {result.simulations.toLocaleString('en-US')} simulations · {result.years} years
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
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
  projBars: {
    marginTop: 12,
  },
  projBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  projBarLabel: {
    fontFamily: serif,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#98989d',
    width: 54,
  },
  projBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#1c1c1e',
  },
  projBarFill: {
    height: 10,
  },
  meta: {
    fontFamily: serif,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#98989d',
    marginTop: 10,
  },
});
