// Session store: holds the auth token + user, persisted to localStorage so the
// user stays logged in across page reloads.

const SESSION_KEY = "onthemoney-session";

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

export function loadSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as Session;
    if (!session.token || !session.user) throw new Error("malformed session");
    currentSession = session;
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(session: Session): void {
  currentSession = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  currentSession = null;
  localStorage.removeItem(SESSION_KEY);
}
