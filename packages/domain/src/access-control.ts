import type { ActorRole, AppActor, StaffScopedRole } from "./identity";

export type Permission =
  | "platform.config.read"
  | "location.read"
  | "catalog.read"
  | "booking.create"
  | "booking.manage.self"
  | "booking.manage.location"
  | "membership.read.self"
  | "referral.read.self"
  | "referral.apply.self"
  | "provider.schedule.read.self"
  | "provider.schedule.write.self"
  | "provider.payout.read.self"
  | "admin.location.manage"
  | "admin.machine.manage"
  | "admin.room.manage"
  | "admin.provider.manage"
  | "admin.service.manage"
  | "admin.package.manage"
  | "admin.membership.manage"
  | "admin.customer.manage"
  | "admin.referral.manage"
  | "admin.payout.manage"
  | "admin.import.manage"
  | "admin.onboarding.read"
  | "admin.support.manage"
  | "admin.audit.read"
  | "admin.reporting.read";

export interface RoleDefinition {
  code: ActorRole;
  name: string;
  description: string;
  permissions: Permission[];
  assignable: boolean;
  requiresLocationScope: boolean;
}

const rolePermissions: Record<ActorRole, Permission[]> = {
  customer: [
    "platform.config.read",
    "location.read",
    "catalog.read",
    "booking.create",
    "booking.manage.self",
    "membership.read.self",
    "referral.read.self",
    "referral.apply.self",
  ],
  provider: [
    "platform.config.read",
    "location.read",
    "catalog.read",
    "booking.manage.self",
    "provider.schedule.read.self",
    "provider.schedule.write.self",
    "provider.payout.read.self",
  ],
  staff: [
    "platform.config.read",
    "location.read",
    "catalog.read",
    "booking.manage.location",
    "admin.reporting.read",
  ],
  admin: [
    "platform.config.read",
    "location.read",
    "catalog.read",
    "booking.manage.location",
    "admin.location.manage",
    "admin.machine.manage",
    "admin.room.manage",
    "admin.provider.manage",
    "admin.service.manage",
    "admin.package.manage",
    "admin.membership.manage",
    "admin.customer.manage",
    "admin.referral.manage",
    "admin.payout.manage",
    "admin.import.manage",
    "admin.onboarding.read",
    "admin.support.manage",
    "admin.audit.read",
    "admin.reporting.read",
  ],
  owner: [
    "platform.config.read",
    "location.read",
    "catalog.read",
    "booking.manage.location",
    "admin.location.manage",
    "admin.machine.manage",
    "admin.room.manage",
    "admin.provider.manage",
    "admin.service.manage",
    "admin.package.manage",
    "admin.membership.manage",
    "admin.customer.manage",
    "admin.referral.manage",
    "admin.payout.manage",
    "admin.import.manage",
    "admin.onboarding.read",
    "admin.support.manage",
    "admin.audit.read",
    "admin.reporting.read",
  ],
};

const roleDefinitions: RoleDefinition[] = [
  {
    code: "customer",
    name: "Customer",
    description: "Customer-facing role for booking, memberships, referrals, and orders.",
    permissions: rolePermissions.customer,
    assignable: false,
    requiresLocationScope: false,
  },
  {
    code: "provider",
    name: "Provider",
    description: "Service provider role with schedule and payout access.",
    permissions: rolePermissions.provider,
    assignable: false,
    requiresLocationScope: false,
  },
  {
    code: "staff",
    name: "Staff",
    description: "Location-scoped operational role with reporting access.",
    permissions: rolePermissions.staff,
    assignable: true,
    requiresLocationScope: true,
  },
  {
    code: "admin",
    name: "Admin",
    description: "Location-scoped administrative role for operations and reporting.",
    permissions: rolePermissions.admin,
    assignable: true,
    requiresLocationScope: true,
  },
  {
    code: "owner",
    name: "Owner",
    description: "Highest-trust operating role with cross-location authority.",
    permissions: rolePermissions.owner,
    assignable: false,
    requiresLocationScope: false,
  },
];

export const resolvePermissions = (roles: ActorRole[]): Permission[] =>
  [...new Set(roles.flatMap((role) => rolePermissions[role]))];

export const listRoleDefinitions = (): RoleDefinition[] =>
  roleDefinitions.map((definition) => ({
    ...definition,
    permissions: [...definition.permissions],
  }));

export const isAssignableScopedRole = (role: ActorRole): role is StaffScopedRole =>
  role === "staff" || role === "admin";

export const can = (actor: AppActor, permission: Permission): boolean =>
  actor.permissions.includes(permission);

export const hasLocationScope = (
  actor: AppActor,
  locationSlug: string,
): boolean => actor.roles.includes("owner") || actor.locationScopes.includes(locationSlug);

export const canManageLocation = (
  actor: AppActor,
  permission: Permission,
  locationSlug: string,
): boolean => can(actor, permission) && hasLocationScope(actor, locationSlug);
