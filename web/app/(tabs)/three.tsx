import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import ScreenFrame from '@/components/ScreenFrame';
import { serif } from '@/constants/Colors';
import { CONTENT_MAX_WIDTH, useResponsiveLayout } from '@/constants/responsive';
import {
  fetchStockOverview,
  fetchWatchlist,
  searchStocks,
  addToWatchlist,
  removeFromWatchlist,
  fetchStockQuote,
  type StockQuote,
  type StockSearchResult,
} from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function StocksScreen() {
  const { scale, isDesktop } = useResponsiveLayout();

  const [indices, setIndices] = useState<StockQuote[]>([]);
  const [watchlist, setWatchlist] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [detailQuote, setDetailQuote] = useState<StockQuote | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, wl] = await Promise.all([
        fetchStockOverview(),
        fetchWatchlist().catch(() => []),
      ]);
      setIndices(overview.indices);
      setWatchlist(wl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 1) return;
    setSearching(true);
    try {
      const res = await searchStocks(q);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const openDetail = useCallback(async (symbol: string) => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const q = await fetchStockQuote(symbol);
      setDetailQuote(q);
    } catch {
      setDetailQuote(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const toggleWatchlist = useCallback(
    async (symbol: string) => {
      const inList = watchlist.some((w) => w.symbol === symbol);
      try {
        if (inList) {
          await removeFromWatchlist(symbol);
          setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
        } else {
          await addToWatchlist(symbol);
          const q = await fetchStockQuote(symbol);
          setWatchlist((prev) => [...prev, q]);
        }
      } catch {
        // silently fail
      }
    },
    [watchlist],
  );

  const quoteColor = (change: number) => (change >= 0 ? '#00ff88' : '#ff6b6b');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#98989d" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.contentWide,
          { paddingBottom: 80 },
        ]}
        data={[0]}
        keyExtractor={() => 'page'}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <>
            {/* Market Overview */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Market Overview</Text>
            </View>
            {indices.length === 0 ? (
              <Text style={styles.empty}>No market data available.</Text>
            ) : (
              <View style={styles.indexGrid}>
                {indices.map((idx) => (
                  <Pressable
                    key={idx.symbol}
                    style={({ pressed }) => [styles.indexCard, pressed && styles.cardPressed]}
                    onPress={() => openDetail(idx.symbol)}
                  >
                    <Text style={styles.indexName}>{idx.name}</Text>
                    <Text style={styles.indexPrice}>${formatMoney(idx.currentPrice)}</Text>
                    <Text style={[styles.indexChange, { color: quoteColor(idx.percentChange) }]}>
                      {idx.percentChange >= 0 ? '+' : ''}
                      {idx.percentChange.toFixed(2)}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Search */}
            <View style={[styles.sectionHeader, styles.sectionOffset]}>
              <Text style={styles.sectionTitle}>Search Stocks</Text>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search symbol or company..."
                placeholderTextColor="#98989d"
                onSubmitEditing={doSearch}
                returnKeyType="search"
              />
              <Pressable
                style={({ pressed }) => [styles.searchButton, pressed && styles.cardPressed]}
                onPress={doSearch}
              >
                <Text style={styles.searchButtonText}>Go</Text>
              </Pressable>
            </View>
            {searching && <ActivityIndicator color="#98989d" style={{ marginTop: 8 }} />}
            {results.map((r) => {
              const inWatchlist = watchlist.some((w) => w.symbol === r.symbol);
              return (
                <Pressable
                  key={r.symbol}
                  style={({ pressed }) => [styles.resultRow, pressed && styles.cardPressed]}
                  onPress={() => openDetail(r.symbol)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultSymbol}>{r.symbol}</Text>
                    <Text style={styles.resultDesc} numberOfLines={1}>
                      {r.description}
                    </Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => toggleWatchlist(r.symbol)}>
                    <SymbolView
                      name={
                        inWatchlist
                          ? { ios: 'star.fill', android: 'star', web: 'star' }
                          : { ios: 'star', android: 'star_border', web: 'star_border' }
                      }
                      tintColor={inWatchlist ? '#ffcc00' : '#98989d'}
                      size={20}
                    />
                  </Pressable>
                </Pressable>
              );
            })}

            {/* Watchlist */}
            <View style={[styles.sectionHeader, styles.sectionOffset]}>
              <Text style={styles.sectionTitle}>Watchlist</Text>
            </View>
            {watchlist.length === 0 ? (
              <Text style={styles.empty}>No stocks in your watchlist yet.</Text>
            ) : (
              watchlist.map((stock) => (
                <Pressable
                  key={stock.symbol}
                  style={({ pressed }) => [styles.watchRow, pressed && styles.cardPressed]}
                  onPress={() => openDetail(stock.symbol)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.watchSymbol}>{stock.symbol}</Text>
                    <Text style={styles.watchName} numberOfLines={1}>
                      {stock.name}
                    </Text>
                  </View>
                  <View style={styles.watchRight}>
                    <Text style={styles.watchPrice}>${formatMoney(stock.currentPrice)}</Text>
                    <Text style={[styles.watchChange, { color: quoteColor(stock.percentChange) }]}>
                      {stock.percentChange >= 0 ? '+' : ''}
                      {stock.percentChange.toFixed(2)}%
                    </Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => toggleWatchlist(stock.symbol)}>
                    <SymbolView
                      name={{ ios: 'xmark', android: 'close', web: 'close' }}
                      tintColor="#98989d"
                      size={16}
                    />
                  </Pressable>
                </Pressable>
              ))
            )}
          </>
        )}
      />

      {/* Quote Detail Modal */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDetailOpen(false);
          setDetailQuote(null);
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.detailDialog}>
            {loadingDetail ? (
              <ActivityIndicator color="#98989d" />
            ) : detailQuote ? (
              <>
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailSymbol}>{detailQuote.symbol}</Text>
                    <Text style={styles.detailName} numberOfLines={1}>
                      {detailQuote.name}
                    </Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => toggleWatchlist(detailQuote.symbol)}>
                    <SymbolView
                      name={
                        watchlist.some((w) => w.symbol === detailQuote.symbol)
                          ? { ios: 'star.fill', android: 'star', web: 'star' }
                          : { ios: 'star', android: 'star_border', web: 'star_border' }
                      }
                      tintColor={
                        watchlist.some((w) => w.symbol === detailQuote.symbol)
                          ? '#ffcc00'
                          : '#98989d'
                      }
                      size={22}
                    />
                  </Pressable>
                </View>
                <Text style={[styles.detailPrice, { color: quoteColor(detailQuote.change) }]}>
                  ${formatMoney(detailQuote.currentPrice)}
                </Text>
                <Text style={[styles.detailChange, { color: quoteColor(detailQuote.change) }]}>
                  {detailQuote.change >= 0 ? '+' : ''}
                  {formatMoney(detailQuote.change)} ({detailQuote.percentChange >= 0 ? '+' : ''}
                  {detailQuote.percentChange.toFixed(2)}%)
                </Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Open</Text>
                    <Text style={styles.detailValue}>${formatMoney(detailQuote.open)}</Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Prev Close</Text>
                    <Text style={styles.detailValue}>
                      ${formatMoney(detailQuote.previousClose)}
                    </Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>High</Text>
                    <Text style={styles.detailValue}>${formatMoney(detailQuote.high)}</Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Low</Text>
                    <Text style={styles.detailValue}>${formatMoney(detailQuote.low)}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.error}>Could not load quote.</Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.cardPressed]}
              onPress={() => {
                setDetailOpen(false);
                setDetailQuote(null);
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
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
    padding: 16,
  },
  contentWide: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  sectionOffset: {
    marginTop: 28,
  },
  empty: {
    fontFamily: serif,
    color: '#98989d',
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
  },
  error: {
    fontFamily: serif,
    color: '#ff6b6b',
  },
  // Market indices
  indexGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  indexCard: {
    borderWidth: 1,
    borderColor: '#fff',
    padding: 12,
    minWidth: 100,
    flexGrow: 1,
  },
  indexName: {
    fontFamily: serif,
    fontSize: 11,
    color: '#98989d',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  indexPrice: {
    fontFamily: serif,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  indexChange: {
    fontFamily: serif,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cardPressed: {
    backgroundColor: '#1a1a1a',
  },
  // Search
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: serif,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  searchButton: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontFamily: serif,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
    gap: 12,
  },
  resultSymbol: {
    fontFamily: serif,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  resultDesc: {
    fontFamily: serif,
    fontSize: 12,
    color: '#98989d',
    marginTop: 2,
  },
  // Watchlist
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#fff',
    marginTop: 8,
    gap: 12,
  },
  watchSymbol: {
    fontFamily: serif,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  watchName: {
    fontFamily: serif,
    fontSize: 12,
    color: '#98989d',
    marginTop: 2,
  },
  watchRight: {
    alignItems: 'flex-end',
  },
  watchPrice: {
    fontFamily: serif,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  watchChange: {
    fontFamily: serif,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // Detail modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailDialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 24,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailSymbol: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  detailName: {
    fontFamily: serif,
    fontSize: 13,
    color: '#98989d',
    marginTop: 2,
  },
  detailPrice: {
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
  },
  detailChange: {
    fontFamily: serif,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 0,
  },
  detailCell: {
    width: '50%',
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2c2c2e',
  },
  detailLabel: {
    fontFamily: serif,
    fontSize: 11,
    color: '#98989d',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailValue: {
    fontFamily: serif,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  closeButton: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    fontFamily: serif,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
