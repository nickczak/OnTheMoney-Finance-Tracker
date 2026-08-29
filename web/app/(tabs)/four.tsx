import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { useResponsiveLayout } from '@/constants/responsive';
import { useAuth } from '@/lib/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { scale } = useResponsiveLayout();

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={[styles.name, { fontSize: 24 * scale }]}>{user?.displayName ?? 'User'}</Text>
        <Text style={[styles.email, { fontSize: 14 * scale }]}>{user?.email ?? ''}</Text>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
          onPress={() => void signOut()}
        >
          <SymbolView
            name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
            tintColor="#ff6b6b"
            size={18}
          />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#48484a',
  },
  initials: {
    fontFamily: serif,
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontFamily: serif,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  email: {
    fontFamily: serif,
    color: '#98989d',
    marginTop: 4,
    marginBottom: 28,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  logoutPressed: {
    backgroundColor: '#1a1a1a',
  },
  logoutText: {
    fontFamily: serif,
    fontSize: 15,
    fontWeight: '700',
    color: '#ff6b6b',
  },
});
