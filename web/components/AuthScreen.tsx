import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { useAuth } from '@/lib/AuthContext';
import { useResponsiveLayout } from '@/constants/responsive';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { scale } = useResponsiveLayout();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (isSignup) {
        await signUp(email.trim(), password, displayName.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { fontSize: 40 * scale }]}>On The Money</Text>
        <Text style={[styles.subtitle, { fontSize: 12 * scale }]}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </Text>

        {/* Outlined card, matching the app's dialogs */}
        <View style={styles.card}>
          {isSignup && (
            <View style={styles.inputRow}>
              <View style={styles.inputIcon}>
                <SymbolView
                  name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                  tintColor="#98989d"
                  size={24}
                />
              </View>
              <TextInput
                style={[styles.input, { fontSize: 18 * scale }]}
                placeholder="Display name"
                placeholderTextColor="#98989d"
                autoCapitalize="words"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          )}
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <SymbolView
                name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
                tintColor="#98989d"
                size={24}
              />
            </View>
            <TextInput
              style={[styles.input, { fontSize: 18 * scale }]}
              placeholder="Email"
              placeholderTextColor="#98989d"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <SymbolView
                name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                tintColor="#98989d"
                size={24}
              />
            </View>
            <TextInput
              style={[styles.input, { fontSize: 18 * scale }]}
              placeholder="Password"
              placeholderTextColor="#98989d"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error && <Text style={[styles.error, { fontSize: 13 * scale }]}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.submit,
              { marginTop: error ? 16 : 8 },
              busy && styles.submitDisabled,
              pressed && styles.submitPressed,
            ]}
            onPress={handleSubmit}
            disabled={busy || !email || !password || (isSignup && !displayName)}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.submitText, { fontSize: 16 * scale }]}>
                {isSignup ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => setMode(isSignup ? 'login' : 'signup')} hitSlop={8}>
          <Text style={[styles.toggle, { fontSize: 14 * scale }]}>
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontFamily: serif,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: serif,
    color: '#98989d',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 24,
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
    color: '#fff',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    textAlign: 'left',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
  },
  error: {
    fontFamily: serif,
    color: '#ff6b6b',
    textAlign: 'center',
  },
  submit: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitPressed: {
    backgroundColor: '#1a1a1a',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontFamily: serif,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  toggle: {
    fontFamily: serif,
    color: '#00ff88',
    marginTop: 24,
    textAlign: 'center',
  },
});
