import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import * as SplashScreen from 'expo-splash-screen';

import * as api from '@/lib/api';
import type { AuthUser } from '@/lib/session';

type AuthContextValue = {
  /** Signed-in user, or null when logged out. */
  user: AuthUser | null;
  /** True until the persisted session has been restored from storage. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Restores the persisted session on mount and extends it server-side (the
 * backend's /api/auth/refresh clears invalid tokens). While `loading` is true
 * the root layout keeps the native splash visible.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const restored = await api.loadSession();
      // Extend the session so frequent users never hit the expiry mid-use.
      const refreshed = await api.refreshSession();
      const active = refreshed ?? restored?.user ?? null;
      setUser(active);
      setLoading(false);
      // When signed out there is no dashboard load that would hide the splash,
      // so reveal the auth screen ourselves. Signed-in launches stay hidden
      // until the portfolio data lands (see (tabs)/index.tsx).
      if (!active) SplashScreen.hideAsync().catch(() => {});
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setUser(await api.signup(email, password, displayName));
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
