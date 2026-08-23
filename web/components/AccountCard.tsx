import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { serif } from '@/constants/Colors';
import { useResponsiveLayout } from '@/constants/responsive';
import { formatMoney } from '@/lib/format';
import type { Account } from '@/types/Account';
import type { SymbolViewProps } from 'expo-symbols';

export type AccountType = Account['accType'];

type IconName = SymbolViewProps['name'];

function accountIcon(accType: AccountType): IconName {
  switch (accType) {
    case 'CHECKING':
      return { ios: 'banknote.fill', android: 'savings', web: 'savings' };
    case 'SAVINGS':
      return { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' };
    case 'CREDIT_CARD':
      return { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' };
    case 'LOAN':
      return { ios: 'dollarsign.circle.fill', android: 'payments', web: 'payments' };
    case 'INVESTMENT':
      return { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' };
  }
}

export default function AccountCard({
  account,
  percent,
  tileWidth,
}: {
  account: Account;
  percent?: number;
  /** Exact width for the compact percentage tile, measured by the dashboard
   *  from the Total Assets / Total Liabilities row so three tiles span the
   *  same width as those two boxes together. Falls back to an even screen
   *  split when not provided (e.g. before the first layout). */
  tileWidth?: number;
}) {
  const router = useRouter();
  const { scale, width } = useResponsiveLayout();
  // Desktop hover feedback (no-op on touch devices / native).
  const [hovered, setHovered] = useState(false);

  const content = (
    <View style={styles.row}>
      <SymbolView name={accountIcon(account.accType)} tintColor="#fff" size={34} />
      <View style={styles.left}>
        <Text
          style={[
            styles.name,
            { fontSize: 18 * scale },
            percent !== undefined && styles.nameCompact,
          ]}
          numberOfLines={1}
        >
          {account.name}
        </Text>
        <Text
          style={[
            styles.type,
            { fontSize: 12 * scale },
            percent !== undefined && styles.typeCompact,
          ]}
        >
          {account.accType}
        </Text>
      </View>
      {percent !== undefined ? (
        <Text
          style={[styles.percent, { fontSize: 28 * scale, flexShrink: 1 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {(percent * 100).toFixed(1)}%
        </Text>
      ) : (
        <Text
          style={[styles.balance, { fontSize: 28 * scale, flexShrink: 1 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          ${formatMoney(account.balance)}
        </Text>
      )}
    </View>
  );

  // When showing a percentage the card is purely informational and not tappable.
  // Three tiles share the measured width of the Total Assets / Total Liabilities
  // row: each tile is 1/3 of it minus the 4pt margins either side (8pt between
  // adjacent tiles), so the row spans exactly as wide as the totals boxes.
  if (percent !== undefined) {
    const isDebt = account.accType === 'CREDIT_CARD' || account.accType === 'LOAN';
    const cardWidth = tileWidth ?? (width - 2 * 16 - 12 - 2 * 8) / 3;
    return (
      <View style={[styles.card, styles.cardCompact, { width: cardWidth, height: cardWidth }]}>
        <Text
          style={[
            styles.assetLiability,
            { fontSize: 11 * scale },
            isDebt ? styles.liability : styles.asset,
          ]}
        >
          {isDebt ? 'Liability' : 'Asset'}
        </Text>
        <Text
          style={[styles.name, styles.nameCompact, { fontSize: 18 * scale }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {account.name}
        </Text>
        <Text style={[styles.type, styles.typeCompact, { fontSize: 11 * scale }]}>
          {account.accType}
        </Text>
        <Text style={[styles.percent, styles.percentCompact, { fontSize: 20 * scale }]}>
          {(percent * 100).toFixed(1)}%
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        hovered && styles.cardHovered,
      ]}
      onPress={() => router.push(`/account/${account.id}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 24,
    marginVertical: 6,
  },
  cardPressed: {
    backgroundColor: '#1a1a1a',
  },
  cardHovered: {
    backgroundColor: '#121212',
  },
  cardCompact: {
    backgroundColor: '#000',
    flexGrow: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    margin: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  left: {
    flex: 1,
  },
  name: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  nameCompact: {
    fontSize: 14,
  },
  balance: {
    fontFamily: serif,
    fontSize: 28,
    color: '#fff',
  },
  percent: {
    fontFamily: serif,
    fontSize: 28,
    color: '#fff',
  },
  percentCompact: {
    fontSize: 20,
    marginTop: 4,
  },
  assetLiability: {
    fontFamily: serif,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  asset: {
    color: '#00ff88',
  },
  liability: {
    color: '#ff6b6b',
  },
  type: {
    fontFamily: serif,
    fontSize: 12,
    letterSpacing: 2,
    color: '#fff',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  typeCompact: {
    fontSize: 9,
  },
});
