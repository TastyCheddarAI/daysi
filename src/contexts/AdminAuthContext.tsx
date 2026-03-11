import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  exchangeDaysiBootstrapSessionForRole,
  fetchDaysiMe,
  type DaysiBootstrapRole,
  type DaysiSession,
} from "@/lib/daysi-auth-api";

const ADMIN_AUTH_SESSION_STORAGE_KEY = "daysi_admin_auth_session";

interface AdminAuthState {
  isAdmin: boolean;
  isStaff: boolean;
  isAssociate: boolean;
  roles: string[];
  userId: string | null;
  email: string | null;
  displayName: string | null;
  loading: boolean;
  error: string | null;
  session: DaysiSession | null;
}

interface AdminAuthContextType extends AdminAuthState {
  signIn: (input: {
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const loadStoredAdminSessionToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
};

const storeAdminSessionToken = (token: string) => {
  window.localStorage.setItem(ADMIN_AUTH_SESSION_STORAGE_KEY, token);
};

const clearStoredAdminSessionToken = () => {
  window.localStorage.removeItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
};

const deriveAdminState = (session: DaysiSession): Omit<AdminAuthState, "loading" | "error"> => {
  const roles = session.actor.roles;
  const isOwner = roles.includes("owner");
  const isAdmin = isOwner || roles.includes("admin");
  const isStaff = isAdmin || roles.includes("staff");

  return {
    isAdmin,
    isStaff,
    isAssociate: false,
    roles,
    userId: session.actor.userId,
    email: session.actor.email ?? null,
    displayName: session.actor.displayName,
    session,
  };
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isStaff: false,
    isAssociate: false,
    roles: [],
    userId: null,
    email: null,
    displayName: null,
    loading: true,
    error: null,
    session: null,
  });

  const clearSessionState = useCallback(() => {
    clearStoredAdminSessionToken();
    setState({
      isAdmin: false,
      isStaff: false,
      isAssociate: false,
      roles: [],
      userId: null,
      email: null,
      displayName: null,
      loading: false,
      error: null,
      session: null,
    });
  }, []);

  const applySession = useCallback((session: DaysiSession) => {
    const nextState = deriveAdminState(session);
    storeAdminSessionToken(session.access_token);
    setState({
      ...nextState,
      loading: false,
      error: nextState.isStaff ? null : "Admin access is restricted.",
    });
  }, []);

  const refreshRole = useCallback(async () => {
    const token = loadStoredAdminSessionToken();
    if (!token) {
      clearSessionState();
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const nextSession = await fetchDaysiMe(token);
      applySession(nextSession);
    } catch (error) {
      clearSessionState();
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Failed to verify admin access.",
      }));
    }
  }, [applySession, clearSessionState]);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const token = loadStoredAdminSessionToken();
      if (!token) {
        if (!cancelled) {
          setState((current) => ({ ...current, loading: false }));
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
      }
    };

    restore();

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSessionState]);

  const signIn = useCallback(
    async (input: {
      email: string;
      password: string;
    }) => {
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const session = await exchangeDaysiBootstrapSessionForRole({
          email: input.email,
          password: input.password,
          requestedRole: "owner", // API will validate and return actual role
        });
        applySession(session);
      } catch (error) {
        clearStoredAdminSessionToken();
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Invalid email or password.",
        }));
        throw error;
      }
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    clearSessionState();
  }, [clearSessionState]);

  return (
    <AdminAuthContext.Provider value={{ ...state, signIn, signOut, refreshRole }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuthContext() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuthContext must be used within AdminAuthProvider");
  }
  return context;
}
