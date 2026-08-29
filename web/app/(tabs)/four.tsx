import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { CONTENT_MAX_WIDTH, useResponsiveLayout } from '@/constants/responsive';
import { useAuth } from '@/lib/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { scale, isDesktop } = useResponsiveLayout();

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
      <View style={[styles.content, isDesktop && styles.contentWide]}>
        {/* Avatar + Name */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={[styles.name, { fontSize: 22 * scale }]}>{user?.displayName ?? 'User'}</Text>
          <Text style={[styles.email, { fontSize: 13 * scale }]}>{user?.email ?? ''}</Text>
        </View>

        {/* Settings list */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => void signOut()}
          >
            <View style={styles.rowLeft}>
              <SymbolView
                name={{
                  ios: 'rectangle.portrait.and.arrow.right',
                  android: 'logout',
                  web: 'logout',
                }}
                tintColor="#ff6b6b"
                size={20}
              />
              <Text style={[styles.rowLabel, { color: '#ff6b6b' }]}>Log Out</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor="#48484a"
              size={16}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentWide: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#48484a',
  },
  initials: {
    fontFamily: serif,
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontFamily: serif,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
  },
  email: {
    fontFamily: serif,
    color: '#98989d',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
  },
  rowPressed: {
    backgroundColor: '#1a1a1a',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontFamily: serif,
    fontSize: 16,
  },
});
