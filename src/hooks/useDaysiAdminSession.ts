import { useAdminAuthContext } from "@/contexts/AdminAuthContext";

export function useDaysiAdminSession() {
  const adminAuth = useAdminAuthContext();

  return {
    actor: adminAuth.session?.actor ?? null,
    data: adminAuth.session,
    token: adminAuth.session?.access_token ?? null,
    ready: !adminAuth.loading && !!adminAuth.session?.access_token && adminAuth.isStaff,
    isLoading: adminAuth.loading,
    error: adminAuth.error ? new Error(adminAuth.error) : null,
  };
}
