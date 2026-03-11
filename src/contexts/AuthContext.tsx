import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  clearStoredDaysiSessionToken,
  exchangeDaysiBootstrapSession,
  fetchDaysiMe,
  loadStoredDaysiSessionToken,
  storeDaysiSessionToken,
  toDaysiAuthUser,
  type DaysiAuthUser,
  type DaysiSession,
} from "@/lib/daysi-auth-api";

interface AuthContextType {
  user: DaysiAuthUser | null;
  session: DaysiSession | null;
  loading: boolean;
  signIn: (input: { email: string; displayName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DaysiAuthUser | null>(null);
  const [session, setSession] = useState<DaysiSession | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSessionState = useCallback(() => {
    clearStoredDaysiSessionToken();
    setUser(null);
    setSession(null);
  }, []);

  const applySession = useCallback((nextSession: DaysiSession) => {
    storeDaysiSessionToken(nextSession.access_token);
    setSession(nextSession);
    setUser(toDaysiAuthUser(nextSession.actor));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const token = loadStoredDaysiSessionToken();
      if (!token) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const restoredSession = await fetchDaysiMe(token);
        if (!cancelled) {
          applySession(restoredSession);
        }
      } catch {
        if (!cancelled) {
          clearSessionState();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restore();

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSessionState]);

  const signIn = useCallback(
    async (input: { email: string; displayName?: string }) => {
      setLoading(true);
      try {
        const nextSession = await exchangeDaysiBootstrapSession(input);
        applySession(nextSession);
      } finally {
        setLoading(false);
      }
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    clearSessionState();
  }, [clearSessionState]);

  const refreshSession = useCallback(async () => {
    const token = loadStoredDaysiSessionToken();
    if (!token) {
      clearSessionState();
      return;
    }

    const refreshedSession = await fetchDaysiMe(token);
    applySession(refreshedSession);
  }, [applySession, clearSessionState]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
