import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminAuthContext } from "@/contexts/AdminAuthContext";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isStaff, isAssociate, loading, signOut, email } = useAdminAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!isStaff && !isAdmin) {
    return <Navigate to="/admin/auth" replace />;
  }

  const getRoleLabel = () => {
    if (isAdmin) return "Administrator";
    if (isAssociate) return "Associate";
    return "Staff";
  };

  return (
    <div className="min-h-screen bg-muted/30 overflow-x-hidden max-w-full">
      <AdminSidebar isAdmin={isAdmin} isAssociate={isAssociate} onSignOut={signOut} />
      
      {/* Main content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen max-w-full overflow-x-hidden",
        "lg:ml-64" // Sidebar width
      )}>
        {/* Top bar */}
        <header className="h-16 bg-background border-b sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="w-10 lg:hidden flex-shrink-0" /> {/* Spacer for mobile menu button */}
          <div className="flex items-center gap-4 ml-auto min-w-0">
            <div className="text-right min-w-0">
              <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-none">{email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {getRoleLabel()}
              </p>
            </div>
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
              isAdmin ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}>
              {email?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-3 sm:p-6 w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
