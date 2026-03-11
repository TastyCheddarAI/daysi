import { Card, CardContent } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { BusinessSettingsCard } from "@/components/admin/BusinessSettingsCard";
import { UserManagement } from "@/components/admin/UserManagement";
import { ReferralSettingsCard } from "@/components/admin/ReferralSettingsCard";
import { Shield } from "lucide-react";

export default function AdminSettings() {
  const { isAdmin } = useAdminAuth(true);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Admin Access Required</h3>
          <p className="text-muted-foreground mt-1">
            You need administrator privileges to access settings
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold truncate">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business settings and preferences
        </p>
      </div>

      <BusinessSettingsCard />

      <ReferralSettingsCard />

      <UserManagement />
    </div>
  );
}
