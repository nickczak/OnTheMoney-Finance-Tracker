import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import * as api from "@/lib/api";
import type { AuthUser } from "@/lib/session";

type AuthContextValue = {
  /** Signed-in user, or null when logged out. */
  user: AuthUser | null;
  /** True until the persisted session has been restored from storage. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Restores the persisted session on mount and extends it server-side (the
 * backend's /api/auth/refresh clears invalid tokens).
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
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      setUser(await api.signup(email, password, displayName));
    },
    [],
  );

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// react-refresh/only-export-components: a Context module that exports both the
// provider component and its consumer hook is an idiomatic React pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
