import { useAuth } from "@/contexts/AuthContext";
import { loadStoredDaysiSessionToken } from "@/lib/daysi-auth-api";

export interface DaysiSessionState {
  token: string | null;
  userId: string | null;
  email: string | null;
  roles: string[];
  locationScopes: string[];
  ready: boolean;
}

export function useDaysiSession(): DaysiSessionState {
  const { user, session, loading } = useAuth();
  const token = session?.access_token || loadStoredDaysiSessionToken();
  
  return {
    token: token || null,
    userId: user?.id || null,
    email: user?.email || null,
    roles: user?.roles || [],
    locationScopes: user?.locationScopes || [],
    ready: !loading && !!token && !!user,
  };
}

export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && !!user;
}
