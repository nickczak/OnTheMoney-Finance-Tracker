import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { serif } from '@/constants/Colors';
import type { Account } from '@/types/Account';

export default function AccountCard({ account, percent }: { account: Account; percent?: number }) {
  const router = useRouter();

  const content = (
    <View style={styles.row}>
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
    return (
      <View style={[styles.card, styles.cardCompact]}>
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
    borderWidth: 0.5,
    borderColor: '#fff',
    padding: 30,
    marginVertical: 8,
  },
  cardPressed: {
    backgroundColor: '#1a1a1a',
  },
  cardCompact: {
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
