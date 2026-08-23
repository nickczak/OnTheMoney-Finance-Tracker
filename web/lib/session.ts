// Session store: holds the auth token + user, persisted to AsyncStorage so the
// user stays logged in across app restarts. Mirrors QuickQuill's client-side
// Auth service (token resolved server-side; never trust client-supplied ids).

const SESSION_KEY = 'onthemoney-session';

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
};

export type Session = {
  token: string;
  user: AuthUser;
};

let currentSession: Session | null = null;

export function getSession(): Session | null {
  return currentSession;
}

export function getToken(): string | null {
  return currentSession?.token ?? null;
}

/** Loads the persisted session at app startup. Returns the session or null. */
export async function loadSession(): Promise<Session | null> {
  try {
    const AsyncStorage = await storage();
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as Session;
    if (!session.token || !session.user) throw new Error('malformed session');
    currentSession = session;
    return session;
  } catch {
    await clearSession();
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  currentSession = session;
  const AsyncStorage = await storage();
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  currentSession = null;
  const AsyncStorage = await storage();
  await AsyncStorage.removeItem(SESSION_KEY);
}

// Lazy require keeps module import side-effect free and plays nice with web,
// where react-native-web aliases the package to localStorage.
async function storage() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}
