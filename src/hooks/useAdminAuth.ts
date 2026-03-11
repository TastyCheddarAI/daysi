import { useAdminAuthContext } from "@/contexts/AdminAuthContext";
import { useEffect } from "react";
import { toast } from "sonner";

export function useAdminAuth(requireAdmin = false) {
  const context = useAdminAuthContext();

  useEffect(() => {
    if (!context.loading && requireAdmin && !context.isAdmin) {
      toast.error("This action requires admin privileges.");
    }
  }, [context.loading, context.isAdmin, requireAdmin]);

  return {
    ...context,
    error: requireAdmin && !context.isAdmin ? "Admin role required" : context.error,
  };
}
