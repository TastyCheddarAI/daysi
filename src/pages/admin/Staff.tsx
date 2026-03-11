import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Edit,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCog,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDaysiAdminProviders,
  useUpdateDaysiAdminProvider,
} from "@/hooks/useDaysiAdminBookings";
import {
  useDaysiAdminRoleAssignments,
  useCreateDaysiAdminRoleAssignment,
  useUpdateDaysiAdminRoleAssignment,
  useDeleteDaysiAdminRoleAssignment,
} from "@/hooks/useDaysiAdminSettings";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import type { DaysiAdminProviderSummary, DaysiAdminRoleAssignment } from "@/lib/daysi-admin-api";

type CombinedStaff = 
  | ({ type: "provider" } & DaysiAdminProviderSummary)
  | ({ type: "user" } & DaysiAdminRoleAssignment);

export default function AdminStaff() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DaysiAdminRoleAssignment | null>(null);
  
  // Provider edit state
  const [isProviderEditDialogOpen, setIsProviderEditDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<DaysiAdminProviderSummary | null>(null);
  const [providerCommission, setProviderCommission] = useState(30);
  
  // Form state
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<DaysiAdminRoleAssignment["role"]>("staff");

  const providersQuery = useDaysiAdminProviders(locationSlug);
  const assignmentsQuery = useDaysiAdminRoleAssignments();
  const createAssignment = useCreateDaysiAdminRoleAssignment();
  const updateAssignment = useUpdateDaysiAdminRoleAssignment();
  const deleteAssignment = useDeleteDaysiAdminRoleAssignment();
  const updateProvider = useUpdateDaysiAdminProvider();

  const filteredStaff = useMemo(() => {
    const providers = (providersQuery.data ?? []).map((p): CombinedStaff => ({ ...p, type: "provider" }));
    const users = (assignmentsQuery.data ?? []).map((u): CombinedStaff => ({ ...u, type: "user" }));
    const combined = [...providers, ...users];
    
    if (!searchQuery.trim()) return combined;
    const query = searchQuery.toLowerCase();
    return combined.filter((s) => {
      if (s.type === "provider") {
        return (
          s.providerName.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query)
        );
      }
      return s.email.toLowerCase().includes(query);
    });
  }, [providersQuery.data, assignmentsQuery.data, searchQuery]);

  const handleDelete = (user: DaysiAdminRoleAssignment) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteAssignment.mutateAsync({ assignmentId: selectedUser.id });
      toast.success(`Removed access for ${selectedUser.email}`);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove access");
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    try {
      await createAssignment.mutateAsync({
        email: newStaffEmail.toLowerCase().trim(),
        role: newStaffRole,
        locationScopes: [locationSlug],
      });
      toast.success(`Added ${newStaffRole} access for ${newStaffEmail}`);
      setIsAddDialogOpen(false);
      setNewStaffEmail("");
      setNewStaffRole("staff");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add staff");
    }
  };

  const handleEditRole = async () => {
    if (!selectedUser) return;
    try {
      await updateAssignment.mutateAsync({
        assignmentId: selectedUser.id,
        role: newStaffRole,
      });
      toast.success(`Updated role for ${selectedUser.email}`);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  };

  const openEditDialog = (user: DaysiAdminRoleAssignment) => {
    setSelectedUser(user);
    setNewStaffRole(user.role);
    setIsEditDialogOpen(true);
  };

  const loading = providersQuery.isLoading || assignmentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff & Providers</h1>
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => { providersQuery.refetch(); assignmentsQuery.refetch(); }}
            disabled={providersQuery.isFetching || assignmentsQuery.isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(providersQuery.isFetching || assignmentsQuery.isFetching) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {filteredStaff.length} member{filteredStaff.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <EmptyState
              title="No staff found"
              description="Add your first team member to get started"
              action={{ label: "Add Staff", onClick: () => setIsAddDialogOpen(true) }}
            />
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((staff, index) => {
                if (staff.type === "provider") {
                  return (
                    <div
                      key={`provider-${staff.providerSlug}-${index}`}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {staff.providerName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{staff.providerName}</h3>
                            <Badge variant="outline">Provider</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{staff.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Commission: {staff.commissionPercent}% • {staff.serviceSlugs.length} services
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setSelectedProvider(staff);
                        setProviderCommission(staff.commissionPercent);
                        setIsProviderEditDialogOpen(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                }

                return (
                  <div
                    key={`user-${staff.id}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{staff.email}</h3>
                          {staff.role === "owner" ? (
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Owner
                            </Badge>
                          ) : staff.role === "admin" ? (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Shield className="w-3 h-3 mr-1" />
                              Staff
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Locations: {staff.locationScopes.join(", ")}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(staff)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(staff)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Provider vs Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Providers</strong> are service professionals who can be assigned to bookings.
              They have commission rates and can be associated with specific services.
            </p>
            <p>
              <strong>Staff/Admins</strong> have backend access to manage the system. Admins have
              full access, while Staff have limited access to bookings and customers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Permission Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Owner</span>
              <Badge>Full Access</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Admin</span>
              <Badge variant="secondary">Full Access</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="font-medium">Staff</span>
              <Badge variant="outline">Bookings, Customers, Reports</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">Associate</span>
              <Badge variant="outline">Dashboard Only</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Grant backend access to a team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="staff@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newStaffRole} onValueChange={(v: "staff" | "admin") => setNewStaffRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newStaffRole === "admin" 
                  ? "Admins have full access to all features and settings." 
                  : "Staff can manage bookings, customers, and view reports."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff} disabled={createAssignment.isPending}>
              {createAssignment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Add Staff"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={newStaffRole} onValueChange={(v: "staff" | "admin") => setNewStaffRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={updateAssignment.isPending}>
              {updateAssignment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Access
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove access for {selectedUser?.email}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteAssignment.isPending}
            >
              {deleteAssignment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Remove Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Edit Dialog */}
      <Dialog open={isProviderEditDialogOpen} onOpenChange={setIsProviderEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update provider settings for {selectedProvider?.providerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Percentage</Label>
              <Input
                id="commission"
                type="number"
                min={0}
                max={100}
                value={providerCommission}
                onChange={(e) => setProviderCommission(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Percentage of service revenue paid to provider
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProviderEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedProvider) return;
                try {
                  await updateProvider.mutateAsync({
                    providerSlug: selectedProvider.providerSlug,
                    locationSlug: selectedProvider.locationSlug,
                    commissionPercent: providerCommission,
                  });
                  toast.success(`Updated provider ${selectedProvider.providerName}`);
                  setIsProviderEditDialogOpen(false);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to update provider");
                }
              }}
              disabled={updateProvider.isPending}
            >
              {updateProvider.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
