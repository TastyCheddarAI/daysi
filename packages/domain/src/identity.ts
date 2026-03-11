export type ActorRole = "customer" | "provider" | "staff" | "admin" | "owner";
export type StaffScopedRole = "staff" | "admin";

export interface AppActor {
  userId: string;
  tenantSlug: string;
  email?: string;
  displayName: string;
  roles: ActorRole[];
  locationScopes: string[];
  permissions: string[];
}

export interface AccessAssignment {
  id: string;
  email: string;
  role: StaffScopedRole;
  locationScopes: string[];
  passwordHash?: string; // Required for admin/owner roles
  createdAt: string;
  updatedAt: string;
}

export const hasRole = (actor: AppActor, role: ActorRole): boolean =>
  actor.roles.includes(role);
