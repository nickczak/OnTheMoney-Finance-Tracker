import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { serif } from '@/constants/Colors';
import type { Account } from '@/types/Account';

export default function AccountCard({ account }: { account: Account }) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/account/${account.id}`)}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name} numberOfLines={1}>
            {account.name}
          </Text>
          <Text style={styles.type}>{account.accType}</Text>
        </View>
        <Text style={styles.balance}>${account.balance.toFixed(2)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 20,
    marginVertical: 8,
  },
  cardPressed: {
    backgroundColor: '#1a1a1a',
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
  balance: {
    fontFamily: serif,
    fontSize: 28,
    color: '#fff',
  },
  type: {
    fontFamily: serif,
    fontSize: 12,
    letterSpacing: 2,
    color: '#fff',
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
