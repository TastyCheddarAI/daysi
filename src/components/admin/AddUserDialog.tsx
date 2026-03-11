import { useEffect, useState } from "react";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateDaysiAdminRoleAssignment,
  useUpdateDaysiAdminRoleAssignment,
} from "@/hooks/useDaysiAdminSettings";
import type { DaysiAdminRoleAssignment } from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddUserDialogProps {
  assignment?: DaysiAdminRoleAssignment;
  onSaved?: () => void;
}

interface AccessFormState {
  email: string;
  role: DaysiAdminRoleAssignment["role"];
  locationScopes: string;
}

const parseLocationScopes = (value: string): string[] =>
  [...new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )];

const buildFormState = (assignment?: DaysiAdminRoleAssignment): AccessFormState => ({
  email: assignment?.email ?? "",
  role: assignment?.role ?? "staff",
  locationScopes:
    assignment?.locationScopes.join(", ") ?? DAYSI_DEFAULT_LOCATION_SLUG,
});

export function AddUserDialog({ assignment, onSaved }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<AccessFormState>(buildFormState(assignment));
  const createAssignment = useCreateDaysiAdminRoleAssignment();
  const updateAssignment = useUpdateDaysiAdminRoleAssignment();
  const isEditing = !!assignment;
  const isPending = createAssignment.isPending || updateAssignment.isPending;

  useEffect(() => {
    if (open) {
      setFormData(buildFormState(assignment));
    }
  }, [assignment, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const email = formData.email.trim().toLowerCase();
    const locationScopes = parseLocationScopes(formData.locationScopes);

    if (!email) {
      toast.error("Email is required.");
      return;
    }

    if (locationScopes.length === 0) {
      toast.error("Add at least one location scope.");
      return;
    }

    try {
      if (isEditing) {
        await updateAssignment.mutateAsync({
          assignmentId: assignment!.id,
          role: formData.role,
          locationScopes,
        });
        toast.success(`Updated access for ${email}.`);
      } else {
        await createAssignment.mutateAsync({
          email,
          role: formData.role,
          locationScopes,
        });
        toast.success(`Granted ${formData.role} access to ${email}.`);
      }

      setOpen(false);
      setFormData(buildFormState(assignment));
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save access assignment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : (
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Access
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Access Assignment" : "Add Access Assignment"}</DialogTitle>
          <DialogDescription>
            Daysi admin access is granted by email assignment and location scope. This does not create a password or user account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={isEditing ? "edit-access-email" : "new-access-email"}>Email</Label>
              <Input
                id={isEditing ? "edit-access-email" : "new-access-email"}
                type="email"
                placeholder="team.member@daysi.ca"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                disabled={isEditing || isPending}
                required
              />
              {isEditing ? (
                <p className="text-xs text-muted-foreground">
                  Email is fixed for existing assignments. Revoke and recreate to change it.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor={isEditing ? "edit-access-role" : "new-access-role"}>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: DaysiAdminRoleAssignment["role"]) =>
                  setFormData((current) => ({
                    ...current,
                    role: value,
                  }))
                }
                disabled={isPending}
              >
                <SelectTrigger id={isEditing ? "edit-access-role" : "new-access-role"}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={isEditing ? "edit-access-scopes" : "new-access-scopes"}>
                Location Scopes
              </Label>
              <Input
                id={isEditing ? "edit-access-scopes" : "new-access-scopes"}
                placeholder={DAYSI_DEFAULT_LOCATION_SLUG}
                value={formData.locationScopes}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    locationScopes: event.target.value,
                  }))
                }
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter one or more location slugs separated by commas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Grant Access"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
