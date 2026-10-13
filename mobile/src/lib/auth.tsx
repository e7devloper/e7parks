import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, request } from './api';
import * as storage from './storage';

export type User = { id: number; name: string; email: string; phone: string };
type Session = { token: string; user: User };

type AuthValue = {
  user: User | null;
  loading: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  /** Authenticated request; signs the user out if the session is no longer valid. */
  api: <T>(path: string, options?: { method?: 'GET' | 'POST'; body?: unknown }) => Promise<T>;
};

const KEY = 'e7parks.session';
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setSession(null);
    await storage.removeItem(KEY).catch(() => {});
  }, []);

  const signIn = useCallback(async (next: Session) => {
    setSession(next);
    await storage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(KEY);
        const saved = raw ? (JSON.parse(raw) as Session) : null;
        if (!saved?.token) return;
        // Show the app straight away, then confirm the token is still good.
        setSession(saved);
        setLoading(false);
        const { user } = await request<{ user: User }>('/auth/me', { token: saved.token });
        setSession({ token: saved.token, user });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await signOut();
      } finally {
        setLoading(false);
      }
    })();
  }, [signOut]);

  const token = session?.token ?? null;
  const api = useCallback<AuthValue['api']>(
    async (path, options) => {
      try {
        return await request(path, { ...options, token });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await signOut();
        throw e;
      }
    },
    [token, signOut]
  );

  const value = useMemo(
    () => ({ user: session?.user ?? null, loading, signIn, signOut, api }),
    [session, loading, signIn, signOut, api]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
