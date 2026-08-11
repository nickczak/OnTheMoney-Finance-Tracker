import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { serif } from '@/constants/Colors';
import type { Account } from '@/types/Account';
import type { SymbolViewProps } from 'expo-symbols';

export type AccountType = Account['accType'];

type IconName = SymbolViewProps['name'];

function accountIcon(accType: AccountType): IconName {
  switch (accType) {
    case 'CHECKING':
      return { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' };
    case 'SAVINGS':
      return { ios: 'banknote.fill', android: 'savings', web: 'savings' };
    case 'CREDIT_CARD':
      return { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' };
    case 'LOAN':
      return { ios: 'dollarsign.circle.fill', android: 'payments', web: 'payments' };
    case 'INVESTMENT':
      return { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' };
  }
}

export default function AccountCard({ account, percent }: { account: Account; percent?: number }) {
  const router = useRouter();

  const content = (
    <View style={styles.row}>
      <SymbolView name={accountIcon(account.accType)} tintColor="#fff" size={34} />
      <View style={styles.left}>
        <Text style={[styles.name, percent !== undefined && styles.nameCompact]} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={[styles.type, percent !== undefined && styles.typeCompact]}>
          {account.accType}
        </Text>
      </View>
      {percent !== undefined ? (
        <Text style={[styles.percent, styles.percentCompact]}>{(percent * 100).toFixed(1)}%</Text>
      ) : (
        <Text style={styles.balance}>${account.balance.toFixed(2)}</Text>
      )}
    </View>
  );

  // When showing a percentage the card is purely informational and not tappable,
  // rendered as a compact square so two fit per row.
  if (percent !== undefined) {
    const isDebt = account.accType === 'CREDIT_CARD' || account.accType === 'LOAN';
    return (
      <View style={[styles.card, styles.cardCompact]}>
        <Text style={[styles.assetLiability, isDebt ? styles.liability : styles.asset]}>
          {isDebt ? 'Liability' : 'Asset'}
        </Text>
        <Text style={[styles.name, styles.nameCompact]} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={[styles.type, styles.typeCompact]}>{account.accType}</Text>
        <Text style={[styles.percent, styles.percentCompact]}>{(percent * 100).toFixed(1)}%</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/account/${account.id}`)}
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
  cardCompact: {
    backgroundColor: '#000',
    flexBasis: '30%',
    flexGrow: 0,
    aspectRatio: 1,
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
    fontSize: 15,
    marginTop: 4,
  },
  assetLiability: {
    fontFamily: serif,
    fontSize: 10,
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
