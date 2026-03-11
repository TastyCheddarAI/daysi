import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Shield, ShieldCheck, Trash2, UserCog, UserX } from "lucide-react";
import { toast } from "sonner";

import { useDaysiAdminRoleAssignments, useDeleteDaysiAdminRoleAssignment } from "@/hooks/useDaysiAdminSettings";
import type { DaysiAdminRoleAssignment } from "@/lib/daysi-admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddUserDialog } from "./AddUserDialog";

const formatTimestamp = (value: string) => format(new Date(value), "MMM d, yyyy h:mm a");

const getRoleBadge = (role: DaysiAdminRoleAssignment["role"]) => {
  if (role === "admin") {
    return (
      <Badge className="border-red-500/20 bg-red-500/10 text-red-600">
        <ShieldCheck className="mr-1 h-3 w-3" />
        Admin
      </Badge>
    );
  }

  return (
    <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">
      <Shield className="mr-1 h-3 w-3" />
      Staff
    </Badge>
  );
};

export function UserManagement() {
  const assignmentsQuery = useDaysiAdminRoleAssignments();
  const deleteAssignment = useDeleteDaysiAdminRoleAssignment();
  const [pendingRevoke, setPendingRevoke] = useState<DaysiAdminRoleAssignment | null>(null);

  const assignments = useMemo(
    () =>
      [...(assignmentsQuery.data ?? [])].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [assignmentsQuery.data],
  );

  const confirmRevoke = async () => {
    if (!pendingRevoke) {
      return;
    }

    try {
      await deleteAssignment.mutateAsync({ assignmentId: pendingRevoke.id });
      toast.success(`Revoked access for ${pendingRevoke.email}.`);
      setPendingRevoke(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke access.");
    }
  };

  if (assignmentsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (assignmentsQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to load Daysi access assignments.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Assignment Management</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Grant or revoke staff and admin workspace access by email and location scope.
            </CardDescription>
          </div>
          <AddUserDialog />
        </CardHeader>
        <CardContent className="space-y-4 p-0 sm:p-6">
          <div className="px-6 text-sm text-muted-foreground sm:px-0">
            Access assignments replace the legacy user-role records. Password creation is deferred to the auth cutover.
          </div>

          {assignments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <UserX className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No Daysi access assignments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.email}</TableCell>
                        <TableCell>{getRoleBadge(assignment.role)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {assignment.locationScopes.map((scope) => (
                              <Badge key={scope} variant="outline">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimestamp(assignment.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimestamp(assignment.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <AddUserDialog assignment={assignment} />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPendingRevoke(assignment)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Revoke
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingRevoke} onOpenChange={() => setPendingRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {pendingRevoke?.role ?? "selected"} access for{" "}
              <strong>{pendingRevoke?.email}</strong>. Existing bootstrap sessions for that assignment will stop working on their next authorized request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAssignment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} disabled={deleteAssignment.isPending}>
              {deleteAssignment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
