import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminAccessAssignmentCreateRequestSchema,
  adminAccessAssignmentResponseSchema,
  adminAccessAssignmentsResponseSchema,
  adminAccessAssignmentUpdateRequestSchema,
  adminLocationCreateRequestSchema,
  adminLocationResponseSchema,
  adminLocationsResponseSchema,
  adminLocationUpdateRequestSchema,
  adminRoleAssignmentCreateRequestSchema,
  adminRoleAssignmentResponseSchema,
  adminRoleAssignmentsResponseSchema,
  adminRoleAssignmentUpdateRequestSchema,
  adminRolesResponseSchema,
  adminMachineCreateRequestSchema,
  adminMachineResponseSchema,
  adminMachinesResponseSchema,
  adminMachineUpdateRequestSchema,
  adminMembershipPlanCreateRequestSchema,
  adminMembershipPlanResponseSchema,
  adminMembershipPlansResponseSchema,
  adminMembershipPlanUpdateRequestSchema,
  adminOrganizationCreateRequestSchema,
  adminOrganizationResponseSchema,
  adminOrganizationsResponseSchema,
  adminOrganizationUpdateRequestSchema,
  adminProviderCompPlanCreateRequestSchema,
  adminProviderCompPlanResponseSchema,
  adminProviderCompPlansResponseSchema,
  adminProviderCompPlanUpdateRequestSchema,
  adminServiceCreateRequestSchema,
  adminRoomCreateRequestSchema,
  adminRoomResponseSchema,
  adminRoomsResponseSchema,
  adminRoomUpdateRequestSchema,
  adminServiceResponseSchema,
  adminServicesResponseSchema,
  adminServiceUpdateRequestSchema,
} from "../../../packages/contracts/src";
import {
  canManageLocation,
  getOrganizationById,
  getOrganizationBySlug,
  getMembershipPlanBySlug,
  getServiceBySlug,
  listRoleDefinitions,
  listOrganizationsForLocationScopes,
  type AccessAssignment,
  type AppActor,
  type CatalogService,
  type LocationOperatingSchedule,
  type MachineResource,
  type MembershipPlan,
  type ProviderCompPlan,
  type RecurringTimeWindow,
  type RoomResource,
  type TenantLocation,
  type TenantOrganization,
} from "../../../packages/domain/src";

import {
  getLocationOperatingSchedule,
  getRuntimeClinicData,
  getRuntimeTenantContext,
  upsertCatalogService,
  upsertLocationOperatingSchedule,
  upsertMachineResource,
  upsertMembershipPlan,
  upsertProviderCompPlan,
  upsertRoomResource,
  upsertTenantLocation,
  upsertTenantOrganization,
} from "./clinic-runtime";
import { getRuntimeStateRepository } from "./persistence/runtime-state-repository";
import type { AppEnv } from "./config";
import { recordAdminAction } from "./admin-audit";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import {
  isCanonicalDefinitionWriteEnabled,
  persistCanonicalLocation,
  persistCanonicalMachine,
  persistCanonicalMembershipPlan,
  persistCanonicalOrganization,
  persistCanonicalProviderCompPlan,
  persistCanonicalRoom,
  persistCanonicalService,
} from "./persistence/canonical-definition-writes";

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const isOwnerActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.includes("owner");

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const normalizeSlug = (value: string, label: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error(`${label} slug is invalid.`);
  }

  return normalized;
};

const toRecurringWindows = (
  template: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }>,
): RecurringTimeWindow[] =>
  template.map((window) => ({
    daysOfWeek: [window.dayOfWeek],
    startMinute: window.startMinute,
    endMinute: window.endMinute,
  }));

const flattenRecurringWindows = (
  windows: RecurringTimeWindow[],
): Array<{ dayOfWeek: number; startMinute: number; endMinute: number }> =>
  windows.flatMap((window) =>
    window.daysOfWeek.map((dayOfWeek) => ({
      dayOfWeek,
      startMinute: window.startMinute,
      endMinute: window.endMinute,
    })),
  );

const buildAdminLocationPayload = (
  location: TenantLocation,
  schedule?: LocationOperatingSchedule,
) => ({
  ...location,
  operatingSchedule: flattenRecurringWindows(schedule?.availability ?? []),
});

const buildAdminMachinePayload = (machine: MachineResource) => ({
  machineSlug: machine.slug,
  machineName: machine.name,
  locationSlug: machine.locationSlug,
  capabilities: machine.capabilitySlugs,
  template: flattenRecurringWindows(machine.availability),
  blockedWindows: machine.blockedWindows.map((window) => ({
    startsAt: window.startAt,
    endsAt: window.endAt,
  })),
});

const buildAdminRoomPayload = (room: RoomResource) => ({
  roomSlug: room.slug,
  roomName: room.name,
  locationSlug: room.locationSlug,
  capabilities: room.capabilitySlugs,
  template: flattenRecurringWindows(room.availability),
  blockedWindows: room.blockedWindows.map((window) => ({
    startsAt: window.startAt,
    endsAt: window.endAt,
  })),
});

const buildAdminOrganizationPayload = (organization: TenantOrganization) => ({
  ...organization,
});

const hasScopedAccessToAllLocations = (
  actor: AppActor,
  locationScopes: string[],
): boolean =>
  actor.roles.includes("owner") ||
  locationScopes.every((locationSlug) =>
    canManageLocation(actor, "admin.location.manage", locationSlug),
  );

const resolveValidatedLocationScopes = (
  tenant: ReturnType<typeof getRuntimeTenantContext>,
  locationScopes: string[],
): string[] => {
  const uniqueScopes = [...new Set(locationScopes)];
  const invalidLocationSlug = uniqueScopes.find(
    (locationSlug) => !tenant.locations.some((location) => location.slug === locationSlug),
  );

  if (invalidLocationSlug) {
    throw new Error(`Location ${invalidLocationSlug} was not found.`);
  }

  return uniqueScopes;
};

const buildAdminAccessAssignmentPayload = (
  assignment: AccessAssignment,
): AccessAssignment => ({
  ...assignment,
});

const ensureScopedAdminAccess = (
  actor: AppActor | null,
  locationSlug: string,
  permission:
    | "admin.location.manage"
    | "admin.machine.manage"
    | "admin.room.manage"
    | "admin.payout.manage"
    | "admin.service.manage"
    | "admin.membership.manage",
): boolean => !!actor && canManageLocation(actor, permission, locationSlug);

const matchAdminLocationPath = (
  pathname: string,
): { locationSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "locations"
  ) {
    return {
      locationSlug: segments[3],
    };
  }

  return null;
};

const matchAdminOrganizationPath = (
  pathname: string,
): { organizationSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "organizations"
  ) {
    return {
      organizationSlug: segments[3],
    };
  }

  return null;
};

const matchAdminAccessAssignmentPath = (
  pathname: string,
): { assignmentId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "access-assignments"
  ) {
    return {
      assignmentId: segments[3],
    };
  }

  return null;
};

const matchAdminRoleAssignmentPath = (
  pathname: string,
): { assignmentId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "role-assignments"
  ) {
    return {
      assignmentId: segments[3],
    };
  }

  return null;
};

const matchAdminServicePath = (
  pathname: string,
): { serviceSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "services"
  ) {
    return {
      serviceSlug: segments[3],
    };
  }

  return null;
};

const matchAdminMachinePath = (
  pathname: string,
): { machineSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "machines"
  ) {
    return {
      machineSlug: segments[3],
    };
  }

  return null;
};

const matchAdminRoomPath = (
  pathname: string,
): { roomSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "rooms"
  ) {
    return {
      roomSlug: segments[3],
    };
  }

  return null;
};

const matchAdminMembershipPlanPath = (
  pathname: string,
): { planSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "membership-plans"
  ) {
    return {
      planSlug: segments[3],
    };
  }

  return null;
};

const matchAdminProviderCompPath = (
  pathname: string,
): { providerSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "provider-comp-plans"
  ) {
    return {
      providerSlug: segments[3],
    };
  }

  return null;
};

export const handleAdminConfigRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const url = buildUrl(input.request, input.env);
  const tenant = getRuntimeTenantContext(input.env);

  if (input.method === "GET" && input.pathname === "/v1/admin/organizations") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const organizations = actor.roles.includes("owner")
      ? tenant.organizations
      : listOrganizationsForLocationScopes(tenant, actor.locationScopes);

    sendJson(
      input.response,
      200,
      adminOrganizationsResponseSchema.parse({
        ok: true,
        data: {
          organizations: organizations.map(buildAdminOrganizationPayload),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/roles") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    sendJson(
      input.response,
      200,
      adminRolesResponseSchema.parse({
        ok: true,
        data: {
          roles: listRoleDefinitions(),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/organizations") {
    if (!isOwnerActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Owner access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminOrganizationCreateRequestSchema.parse(body),
      );
      const slug = normalizeSlug(payload.slug, "Organization");
      const existing = getOrganizationBySlug(tenant, slug);
      if (existing) {
        sendError(input.response, 409, "conflict", "Organization slug already exists.");
        return true;
      }

      const organization: TenantOrganization = {
        id: `org_${randomUUID()}`,
        slug,
        name: payload.name,
        operatingMode: payload.operatingMode,
      };
      const responseOrganization = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalOrganization(input.env, organization),
          getRuntimeTenantContext(input.env).organizations.find(
            (entry) => entry.slug === organization.slug,
          ) ?? organization)
        : upsertTenantOrganization(organization);

      sendJson(
        input.response,
        201,
        adminOrganizationResponseSchema.parse({
          ok: true,
          data: {
            organization: buildAdminOrganizationPayload(responseOrganization),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid organization request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const organizationMatch = matchAdminOrganizationPath(input.pathname);
  if (organizationMatch && input.method === "PATCH") {
    if (!isOwnerActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Owner access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminOrganizationUpdateRequestSchema.parse(body),
      );
      const existing = getOrganizationBySlug(tenant, organizationMatch.organizationSlug);
      if (!existing) {
        sendError(input.response, 404, "not_found", "Organization not found.");
        return true;
      }

      const organization: TenantOrganization = {
        ...existing,
        name: payload.name ?? existing.name,
        operatingMode: payload.operatingMode ?? existing.operatingMode,
      };
      const responseOrganization = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalOrganization(input.env, organization),
          getRuntimeTenantContext(input.env).organizations.find(
            (entry) => entry.slug === organization.slug,
          ) ?? organization)
        : upsertTenantOrganization(organization);

      sendJson(
        input.response,
        200,
        adminOrganizationResponseSchema.parse({
          ok: true,
          data: {
            organization: buildAdminOrganizationPayload(responseOrganization),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid organization update.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (
    input.method === "GET" &&
    (input.pathname === "/v1/admin/access-assignments" ||
      input.pathname === "/v1/admin/role-assignments")
  ) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !hasScopedAccessToAllLocations(actor, [locationSlug])
    ) {
      sendError(input.response, 403, "forbidden", "Location access assignment scope is restricted.");
      return true;
    }

    const assignments = (await input.repositories.configuration.accessAssignments.listAll()).filter(
      (assignment) => {
      if (locationSlug && !assignment.locationScopes.includes(locationSlug)) {
        return false;
      }

      return actor.roles.includes("owner")
        ? true
        : assignment.locationScopes.some((scope) => actor.locationScopes.includes(scope));
      },
    );

    sendJson(
      input.response,
      200,
      (input.pathname === "/v1/admin/role-assignments"
        ? adminRoleAssignmentsResponseSchema
        : adminAccessAssignmentsResponseSchema
      ).parse({
        ok: true,
        data: {
          assignments: assignments.map(buildAdminAccessAssignmentPayload),
        },
      }),
    );
    return true;
  }

  if (
    input.method === "POST" &&
    (input.pathname === "/v1/admin/access-assignments" ||
      input.pathname === "/v1/admin/role-assignments")
  ) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        (input.pathname === "/v1/admin/role-assignments"
          ? adminRoleAssignmentCreateRequestSchema
          : adminAccessAssignmentCreateRequestSchema
        ).parse(body),
      );
      const normalizedEmail = payload.email.toLowerCase();
      const locationScopes = resolveValidatedLocationScopes(tenant, payload.locationScopes);
      if (!hasScopedAccessToAllLocations(input.actor, locationScopes)) {
        sendError(input.response, 403, "forbidden", "Requested assignment scope is restricted.");
        return true;
      }

      const existing = await input.repositories.configuration.accessAssignments.findByEmailAndRole(
        {
        email: normalizedEmail,
        role: payload.role,
        },
      );
      if (existing) {
        sendError(
          input.response,
          409,
          "conflict",
          "An access assignment already exists for this email and role.",
        );
        return true;
      }

      const now = new Date().toISOString();
      const assignment: AccessAssignment = {
        id: `assign_${randomUUID()}`,
        email: normalizedEmail,
        role: payload.role,
        locationScopes,
        createdAt: now,
        updatedAt: now,
      };
      await input.repositories.configuration.accessAssignments.save(assignment);

      sendJson(
        input.response,
        201,
        (input.pathname === "/v1/admin/role-assignments"
          ? adminRoleAssignmentResponseSchema
          : adminAccessAssignmentResponseSchema
        ).parse({
          ok: true,
          data: {
            assignment: buildAdminAccessAssignmentPayload(assignment),
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid access assignment request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const accessAssignmentMatch =
    matchAdminAccessAssignmentPath(input.pathname) ??
    matchAdminRoleAssignmentPath(input.pathname);
  if (accessAssignmentMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        (input.pathname.startsWith("/v1/admin/role-assignments")
          ? adminRoleAssignmentUpdateRequestSchema
          : adminAccessAssignmentUpdateRequestSchema
        ).parse(body),
      );
      const existing = await input.repositories.configuration.accessAssignments.get(
        accessAssignmentMatch.assignmentId,
      );
      if (!existing) {
        sendError(input.response, 404, "not_found", "Access assignment not found.");
        return true;
      }
      if (!hasScopedAccessToAllLocations(input.actor, existing.locationScopes)) {
        sendError(input.response, 403, "forbidden", "Access assignment scope is restricted.");
        return true;
      }

      const locationScopes = payload.locationScopes
        ? resolveValidatedLocationScopes(tenant, payload.locationScopes)
        : existing.locationScopes;
      if (!hasScopedAccessToAllLocations(input.actor, locationScopes)) {
        sendError(input.response, 403, "forbidden", "Requested assignment scope is restricted.");
        return true;
      }

      const nextRole = payload.role ?? existing.role;
      const conflictingAssignment = await input.repositories.configuration.accessAssignments.findByEmailAndRole(
        {
        email: existing.email,
        role: nextRole,
        },
      );
      if (conflictingAssignment && conflictingAssignment.id !== existing.id) {
        sendError(
          input.response,
          409,
          "conflict",
          "An access assignment already exists for this email and role.",
        );
        return true;
      }

      const assignment: AccessAssignment = {
        ...existing,
        role: nextRole,
        locationScopes,
        updatedAt: new Date().toISOString(),
      };
      await input.repositories.configuration.accessAssignments.save(assignment);

      sendJson(
        input.response,
        200,
        (input.pathname.startsWith("/v1/admin/role-assignments")
          ? adminRoleAssignmentResponseSchema
          : adminAccessAssignmentResponseSchema
        ).parse({
          ok: true,
          data: {
            assignment: buildAdminAccessAssignmentPayload(assignment),
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid access assignment update.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (accessAssignmentMatch && input.method === "DELETE") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const existing = await input.repositories.configuration.accessAssignments.get(
      accessAssignmentMatch.assignmentId,
    );
    if (!existing) {
      sendError(input.response, 404, "not_found", "Access assignment not found.");
      return true;
    }
    if (!hasScopedAccessToAllLocations(input.actor, existing.locationScopes)) {
      sendError(input.response, 403, "forbidden", "Access assignment scope is restricted.");
      return true;
    }

    await input.repositories.configuration.accessAssignments.delete(existing.id);
    await recordAdminAction({
      actor: input.actor,
      locationSlug: existing.locationScopes[0],
      action: "access.assignment.revoked",
      entityType: "access_assignment",
      entityId: existing.id,
      summary: `Revoked ${existing.role} access assignment for ${existing.email}`,
      metadata: {
        email: existing.email,
        role: existing.role,
        locationScopes: existing.locationScopes,
      },
      repositories: input.repositories,
    });

    sendJson(
      input.response,
      200,
      (input.pathname.startsWith("/v1/admin/role-assignments")
        ? adminRoleAssignmentResponseSchema
        : adminAccessAssignmentResponseSchema
      ).parse({
        ok: true,
        data: {
          assignment: buildAdminAccessAssignmentPayload(existing),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/locations") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locations = actor.roles.includes("owner")
      ? tenant.locations
      : tenant.locations.filter((location) =>
          actor.locationScopes.includes(location.slug),
        );
    sendJson(
      input.response,
      200,
      adminLocationsResponseSchema.parse({
        ok: true,
        data: {
          locations: locations.map((location) =>
            buildAdminLocationPayload(
              location,
              getLocationOperatingSchedule(input.env, location.slug),
            ),
          ),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/locations") {
    if (!isOwnerActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Owner access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminLocationCreateRequestSchema.parse(body),
      );
      const organization = getOrganizationById(tenant, payload.organizationId);
      if (!organization) {
        sendError(input.response, 404, "not_found", "Organization not found.");
        return true;
      }
      if (tenant.locations.some((location) => location.slug === normalizeSlug(payload.slug, "Location"))) {
        sendError(input.response, 409, "conflict", "Location slug already exists.");
        return true;
      }
      const location: TenantLocation = {
        id: `loc_${randomUUID()}`,
        slug: normalizeSlug(payload.slug, "Location"),
        name: payload.name,
        organizationId: organization.id,
        enabledModules: payload.enabledModules,
      };
      const schedule: LocationOperatingSchedule = {
        locationSlug: location.slug,
        availability: toRecurringWindows(payload.operatingSchedule),
      };

      if (isCanonicalDefinitionWriteEnabled(input.env)) {
        await persistCanonicalLocation({
          env: input.env,
          location,
          operatingSchedule: schedule,
        });
      } else {
        upsertTenantLocation(location);
        upsertLocationOperatingSchedule(schedule);
      }
      const responseLocation =
        getRuntimeTenantContext(input.env).locations.find((entry) => entry.slug === location.slug) ??
        location;

      sendJson(
        input.response,
        201,
        adminLocationResponseSchema.parse({
          ok: true,
          data: {
            location: buildAdminLocationPayload(
              responseLocation,
              getLocationOperatingSchedule(input.env, responseLocation.slug),
            ),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid location request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const locationMatch = matchAdminLocationPath(input.pathname);
  if (locationMatch && input.method === "PATCH") {
    if (
      !ensureScopedAdminAccess(input.actor, locationMatch.locationSlug, "admin.location.manage")
    ) {
      sendError(input.response, 403, "forbidden", "Location admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminLocationUpdateRequestSchema.parse(body),
      );
      const existing = getRuntimeTenantContext(input.env).locations.find(
        (location) => location.slug === locationMatch.locationSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      if (
        payload.organizationId &&
        payload.organizationId !== existing.organizationId &&
        !isOwnerActor(input.actor)
      ) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Only owner scope can reassign a location to another organization.",
        );
        return true;
      }
      if (payload.organizationId) {
        const organization = getOrganizationById(tenant, payload.organizationId);
        if (!organization) {
          sendError(input.response, 404, "not_found", "Organization not found.");
          return true;
        }
      }

      const nextLocation: TenantLocation = {
        ...existing,
        name: payload.name ?? existing.name,
        organizationId: payload.organizationId ?? existing.organizationId,
        enabledModules: payload.enabledModules ?? existing.enabledModules,
      };
      const schedule = payload.operatingSchedule
        ? {
            locationSlug: existing.slug,
            availability: toRecurringWindows(payload.operatingSchedule),
          }
        : undefined;

      if (isCanonicalDefinitionWriteEnabled(input.env)) {
        await persistCanonicalLocation({
          env: input.env,
          location: nextLocation,
          operatingSchedule: schedule,
        });
      } else {
        upsertTenantLocation(nextLocation);
        if (schedule) {
          upsertLocationOperatingSchedule(schedule);
        }
      }
      const responseLocation =
        getRuntimeTenantContext(input.env).locations.find(
          (location) => location.slug === nextLocation.slug,
        ) ?? nextLocation;

      sendJson(
        input.response,
        200,
        adminLocationResponseSchema.parse({
          ok: true,
          data: {
            location: buildAdminLocationPayload(
              responseLocation,
              getLocationOperatingSchedule(input.env, responseLocation.slug),
            ),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid location update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/services") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.service.manage")) {
      sendError(input.response, 403, "forbidden", "Location service access is restricted.");
      return true;
    }
    const clinicData = getRuntimeClinicData(input.env);

    sendJson(
      input.response,
      200,
      adminServicesResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          services: clinicData.catalog.services.filter(
            (service) => service.locationSlug === locationSlug,
          ),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/services") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminServiceCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.service.manage")) {
        sendError(input.response, 403, "forbidden", "Location service access is restricted.");
        return true;
      }
      const location = getRuntimeTenantContext(input.env).locations.find(
        (entry) => entry.slug === payload.locationSlug,
      );
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const service: CatalogService = {
        id: `svc_${randomUUID()}`,
        slug: normalizeSlug(payload.slug, "Service"),
        variantSlug: normalizeSlug(payload.variantSlug, "Service variant"),
        categorySlug: normalizeSlug(payload.categorySlug, "Service category"),
        locationSlug: payload.locationSlug,
        name: payload.name,
        shortDescription: payload.shortDescription,
        description: payload.description,
        durationMinutes: payload.durationMinutes,
        bookable: payload.bookable,
        price: payload.price,
        bookingPolicy: payload.bookingPolicy,
        machineCapabilities: payload.machineCapabilities.map((value) =>
          normalizeSlug(value, "Machine capability"),
        ),
        roomCapabilities: payload.roomCapabilities.map((value) =>
          normalizeSlug(value, "Room capability"),
        ),
        featureTags: payload.featureTags.map((value) => normalizeSlug(value, "Feature tag")),
      };

      let created = service;
      if (isCanonicalDefinitionWriteEnabled(input.env)) {
        await persistCanonicalService(input.env, service);
        created =
          getServiceBySlug(getRuntimeClinicData(input.env).catalog, service.locationSlug, service.slug) ??
          service;
      } else {
        created = upsertCatalogService(service);
      }
      sendJson(
        input.response,
        201,
        adminServiceResponseSchema.parse({
          ok: true,
          data: {
            service: created,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid service request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const serviceMatch = matchAdminServicePath(input.pathname);
  if (serviceMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminServiceUpdateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.service.manage")) {
        sendError(input.response, 403, "forbidden", "Location service access is restricted.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const existing = getServiceBySlug(
        clinicData.catalog,
        payload.locationSlug,
        serviceMatch.serviceSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Service not found.");
        return true;
      }

      const nextService: CatalogService = {
        ...existing,
        variantSlug: payload.variantSlug
          ? normalizeSlug(payload.variantSlug, "Service variant")
          : existing.variantSlug,
        categorySlug: payload.categorySlug
          ? normalizeSlug(payload.categorySlug, "Service category")
          : existing.categorySlug,
        name: payload.name ?? existing.name,
        shortDescription: payload.shortDescription ?? existing.shortDescription,
        description: payload.description ?? existing.description,
        durationMinutes: payload.durationMinutes ?? existing.durationMinutes,
        bookable: payload.bookable ?? existing.bookable,
        price: payload.price ?? existing.price,
        bookingPolicy: payload.bookingPolicy ?? existing.bookingPolicy,
        machineCapabilities:
          payload.machineCapabilities?.map((value) =>
            normalizeSlug(value, "Machine capability"),
          ) ?? existing.machineCapabilities,
        roomCapabilities:
          payload.roomCapabilities?.map((value) =>
            normalizeSlug(value, "Room capability"),
          ) ?? existing.roomCapabilities,
        featureTags:
          payload.featureTags?.map((value) => normalizeSlug(value, "Feature tag")) ??
          existing.featureTags,
      };
      const updated = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalService(input.env, nextService),
          getServiceBySlug(
            getRuntimeClinicData(input.env).catalog,
            nextService.locationSlug,
            nextService.slug,
          ) ?? nextService)
        : upsertCatalogService(nextService);

      sendJson(
        input.response,
        200,
        adminServiceResponseSchema.parse({
          ok: true,
          data: {
            service: updated,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid service update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/machines") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !ensureScopedAdminAccess(actor, locationSlug, "admin.machine.manage")
    ) {
      sendError(input.response, 403, "forbidden", "Location machine access is restricted.");
      return true;
    }
    const clinicData = getRuntimeClinicData(input.env);
    const machines = clinicData.machines.filter((machine) => {
      if (locationSlug) {
        return machine.locationSlug === locationSlug;
      }

      return actor.roles.includes("owner")
        ? true
        : actor.locationScopes.includes(machine.locationSlug);
    });

    sendJson(
      input.response,
      200,
      adminMachinesResponseSchema.parse({
        ok: true,
        data: {
          machines: machines.map(buildAdminMachinePayload),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/rooms") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !ensureScopedAdminAccess(actor, locationSlug, "admin.room.manage")
    ) {
      sendError(input.response, 403, "forbidden", "Location room access is restricted.");
      return true;
    }
    const clinicData = getRuntimeClinicData(input.env);
    const rooms = clinicData.rooms.filter((room) => {
      if (locationSlug) {
        return room.locationSlug === locationSlug;
      }

      return actor.roles.includes("owner")
        ? true
        : actor.locationScopes.includes(room.locationSlug);
    });

    sendJson(
      input.response,
      200,
      adminRoomsResponseSchema.parse({
        ok: true,
        data: {
          rooms: rooms.map(buildAdminRoomPayload),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/machines") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminMachineCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.machine.manage")) {
        sendError(input.response, 403, "forbidden", "Location machine access is restricted.");
        return true;
      }
      const location = getRuntimeTenantContext(input.env).locations.find(
        (entry) => entry.slug === payload.locationSlug,
      );
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const nextMachine: MachineResource = {
        slug: normalizeSlug(payload.slug, "Machine"),
        name: payload.name,
        locationSlug: payload.locationSlug,
        capabilitySlugs: payload.capabilities.map((value) =>
          normalizeSlug(value, "Machine capability"),
        ),
        availability: toRecurringWindows(payload.template),
        blockedWindows: payload.blockedWindows.map((window) => ({
          startAt: window.startsAt,
          endAt: window.endsAt,
        })),
      };
      const machine = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalMachine(input.env, nextMachine),
          getRuntimeClinicData(input.env).machines.find(
            (entry) =>
              entry.locationSlug === nextMachine.locationSlug &&
              entry.slug === nextMachine.slug,
          ) ?? nextMachine)
        : upsertMachineResource(nextMachine);

      sendJson(
        input.response,
        201,
        adminMachineResponseSchema.parse({
          ok: true,
          data: {
            machine: buildAdminMachinePayload(machine),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid machine request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/rooms") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminRoomCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.room.manage")) {
        sendError(input.response, 403, "forbidden", "Location room access is restricted.");
        return true;
      }
      const location = getRuntimeTenantContext(input.env).locations.find(
        (entry) => entry.slug === payload.locationSlug,
      );
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const nextRoom: RoomResource = {
        slug: normalizeSlug(payload.slug, "Room"),
        name: payload.name,
        locationSlug: payload.locationSlug,
        capabilitySlugs: payload.capabilities.map((value) =>
          normalizeSlug(value, "Room capability"),
        ),
        availability: toRecurringWindows(payload.template),
        blockedWindows: payload.blockedWindows.map((window) => ({
          startAt: window.startsAt,
          endAt: window.endsAt,
        })),
      };
      const room = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalRoom(input.env, nextRoom),
          getRuntimeClinicData(input.env).rooms.find(
            (entry) => entry.locationSlug === nextRoom.locationSlug && entry.slug === nextRoom.slug,
          ) ?? nextRoom)
        : upsertRoomResource(nextRoom);

      sendJson(
        input.response,
        201,
        adminRoomResponseSchema.parse({
          ok: true,
          data: {
            room: buildAdminRoomPayload(room),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid room request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const machineMatch = matchAdminMachinePath(input.pathname);
  if (machineMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminMachineUpdateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.machine.manage")) {
        sendError(input.response, 403, "forbidden", "Location machine access is restricted.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const existing = clinicData.machines.find(
        (machine) =>
          machine.locationSlug === payload.locationSlug &&
          machine.slug === machineMatch.machineSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Machine not found.");
        return true;
      }

      const nextMachine: MachineResource = {
        ...existing,
        name: payload.name ?? existing.name,
        capabilitySlugs:
          payload.capabilities?.map((value) =>
            normalizeSlug(value, "Machine capability"),
          ) ?? existing.capabilitySlugs,
        availability: payload.template
          ? toRecurringWindows(payload.template)
          : existing.availability,
        blockedWindows:
          payload.blockedWindows?.map((window) => ({
            startAt: window.startsAt,
            endAt: window.endsAt,
          })) ?? existing.blockedWindows,
      };
      const updated = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalMachine(input.env, nextMachine),
          getRuntimeClinicData(input.env).machines.find(
            (machine) =>
              machine.locationSlug === nextMachine.locationSlug &&
              machine.slug === nextMachine.slug,
          ) ?? nextMachine)
        : upsertMachineResource(nextMachine);

      sendJson(
        input.response,
        200,
        adminMachineResponseSchema.parse({
          ok: true,
          data: {
            machine: buildAdminMachinePayload(updated),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid machine update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const roomMatch = matchAdminRoomPath(input.pathname);
  if (roomMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminRoomUpdateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.room.manage")) {
        sendError(input.response, 403, "forbidden", "Location room access is restricted.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const existing = clinicData.rooms.find(
        (room) =>
          room.locationSlug === payload.locationSlug &&
          room.slug === roomMatch.roomSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Room not found.");
        return true;
      }

      const nextRoom: RoomResource = {
        ...existing,
        name: payload.name ?? existing.name,
        capabilitySlugs:
          payload.capabilities?.map((value) =>
            normalizeSlug(value, "Room capability"),
          ) ?? existing.capabilitySlugs,
        availability: payload.template
          ? toRecurringWindows(payload.template)
          : existing.availability,
        blockedWindows:
          payload.blockedWindows?.map((window) => ({
            startAt: window.startsAt,
            endAt: window.endsAt,
          })) ?? existing.blockedWindows,
      };
      const updated = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalRoom(input.env, nextRoom),
          getRuntimeClinicData(input.env).rooms.find(
            (room) =>
              room.locationSlug === nextRoom.locationSlug &&
              room.slug === nextRoom.slug,
          ) ?? nextRoom)
        : upsertRoomResource(nextRoom);

      sendJson(
        input.response,
        200,
        adminRoomResponseSchema.parse({
          ok: true,
          data: {
            room: buildAdminRoomPayload(updated),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid room update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/membership-plans") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.membership.manage")) {
      sendError(input.response, 403, "forbidden", "Location membership access is restricted.");
      return true;
    }
    const clinicData = getRuntimeClinicData(input.env);

    sendJson(
      input.response,
      200,
      adminMembershipPlansResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          plans: clinicData.membershipPlans.filter((plan) => plan.locationSlug === locationSlug),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/membership-plans") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminMembershipPlanCreateRequestSchema.parse(body),
      );
      if (
        !ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.membership.manage")
      ) {
        sendError(input.response, 403, "forbidden", "Location membership access is restricted.");
        return true;
      }
      const location = getRuntimeTenantContext(input.env).locations.find(
        (entry) => entry.slug === payload.locationSlug,
      );
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const plan: MembershipPlan = {
        id: `mplan_${randomUUID()}`,
        slug: normalizeSlug(payload.slug, "Membership plan"),
        locationSlug: payload.locationSlug,
        name: payload.name,
        description: payload.description,
        billingInterval: payload.billingInterval,
        price: payload.price,
        educationOnly: payload.educationOnly,
        entitlements: payload.entitlements,
      };

      const created = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalMembershipPlan(input.env, plan),
          getMembershipPlanBySlug(
            getRuntimeClinicData(input.env).membershipPlans,
            plan.locationSlug,
            plan.slug,
          ) ?? plan)
        : upsertMembershipPlan(plan);
      sendJson(
        input.response,
        201,
        adminMembershipPlanResponseSchema.parse({
          ok: true,
          data: {
            plan: created,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid membership plan request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const membershipPlanMatch = matchAdminMembershipPlanPath(input.pathname);
  if (membershipPlanMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminMembershipPlanUpdateRequestSchema.parse(body),
      );
      if (
        !ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.membership.manage")
      ) {
        sendError(input.response, 403, "forbidden", "Location membership access is restricted.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const existing = getMembershipPlanBySlug(
        clinicData.membershipPlans,
        payload.locationSlug,
        membershipPlanMatch.planSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Membership plan not found.");
        return true;
      }

      const nextPlan: MembershipPlan = {
        ...existing,
        name: payload.name ?? existing.name,
        description: payload.description ?? existing.description,
        billingInterval: payload.billingInterval ?? existing.billingInterval,
        price: payload.price ?? existing.price,
        educationOnly: payload.educationOnly ?? existing.educationOnly,
        entitlements: payload.entitlements ?? existing.entitlements,
      };
      const updated = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalMembershipPlan(input.env, nextPlan),
          getMembershipPlanBySlug(
            getRuntimeClinicData(input.env).membershipPlans,
            nextPlan.locationSlug,
            nextPlan.slug,
          ) ?? nextPlan)
        : upsertMembershipPlan(nextPlan);

      sendJson(
        input.response,
        200,
        adminMembershipPlanResponseSchema.parse({
          ok: true,
          data: {
            plan: updated,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid membership plan update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (membershipPlanMatch && input.method === "DELETE") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.membership.manage")) {
      sendError(input.response, 403, "forbidden", "Location membership access is restricted.");
      return true;
    }

    const clinicData = getRuntimeClinicData(input.env);
    const existing = getMembershipPlanBySlug(
      clinicData.membershipPlans,
      locationSlug,
      membershipPlanMatch.planSlug,
    );

    if (!existing) {
      sendError(input.response, 404, "not_found", "Membership plan not found.");
      return true;
    }

    sendJson(
      input.response,
      200,
      adminMembershipPlanResponseSchema.parse({
        ok: true,
        data: {
          plan: existing,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/provider-comp-plans") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.payout.manage")) {
      sendError(input.response, 403, "forbidden", "Location compensation access is restricted.");
      return true;
    }
    const clinicData = getRuntimeClinicData(input.env);

    sendJson(
      input.response,
      200,
      adminProviderCompPlansResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          compPlans: clinicData.providerCompPlans.filter(
            (plan) => plan.locationSlug === locationSlug,
          ),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/provider-comp-plans") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminProviderCompPlanCreateRequestSchema.parse(body),
      );
      if (
        !ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.payout.manage")
      ) {
        sendError(input.response, 403, "forbidden", "Location compensation access is restricted.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const provider = clinicData.providers.find(
        (entry) =>
          entry.slug === payload.providerSlug && entry.locationSlug === payload.locationSlug,
      );
      if (!provider) {
        sendError(input.response, 404, "not_found", "Provider not found for this location.");
        return true;
      }
      const serviceSlug = payload.serviceSlug
        ? normalizeSlug(payload.serviceSlug, "Service")
        : undefined;
      if (
        serviceSlug &&
        !getServiceBySlug(clinicData.catalog, payload.locationSlug, serviceSlug)
      ) {
        sendError(input.response, 404, "not_found", "Service not found for this location.");
        return true;
      }

      const nextPlan: ProviderCompPlan = {
        ...payload,
        serviceSlug,
      };
      const created: ProviderCompPlan = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalProviderCompPlan(input.env, nextPlan),
          getRuntimeClinicData(input.env).providerCompPlans.find(
            (plan) =>
              plan.providerSlug === nextPlan.providerSlug &&
              plan.locationSlug === nextPlan.locationSlug &&
              plan.serviceSlug === nextPlan.serviceSlug,
          ) ?? nextPlan)
        : upsertProviderCompPlan(nextPlan);
      sendJson(
        input.response,
        201,
        adminProviderCompPlanResponseSchema.parse({
          ok: true,
          data: {
            compPlan: created,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid provider comp request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const providerCompMatch = matchAdminProviderCompPath(input.pathname);
  if (providerCompMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminProviderCompPlanUpdateRequestSchema.parse(body),
      );
      if (
        !ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.payout.manage")
      ) {
        sendError(input.response, 403, "forbidden", "Location compensation access is restricted.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const provider = clinicData.providers.find(
        (entry) =>
          entry.slug === providerCompMatch.providerSlug &&
          entry.locationSlug === payload.locationSlug,
      );
      if (!provider) {
        sendError(input.response, 404, "not_found", "Provider not found for this location.");
        return true;
      }
      const serviceSlug = payload.serviceSlug
        ? normalizeSlug(payload.serviceSlug, "Service")
        : undefined;
      if (
        serviceSlug &&
        !getServiceBySlug(clinicData.catalog, payload.locationSlug, serviceSlug)
      ) {
        sendError(input.response, 404, "not_found", "Service not found for this location.");
        return true;
      }

      const existing =
        clinicData.providerCompPlans.find(
          (plan) =>
            plan.providerSlug === providerCompMatch.providerSlug &&
            plan.locationSlug === payload.locationSlug &&
            plan.serviceSlug === serviceSlug,
        ) ?? {
          providerSlug: providerCompMatch.providerSlug,
          locationSlug: payload.locationSlug,
          serviceSlug,
          commissionPercent: 0,
          appliesToRevenueStream: "services" as const,
        };

      const nextPlan: ProviderCompPlan = {
        ...existing,
        serviceSlug,
        commissionPercent: payload.commissionPercent ?? existing.commissionPercent,
        appliesToRevenueStream:
          payload.appliesToRevenueStream ?? existing.appliesToRevenueStream,
      };
      const updated = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalProviderCompPlan(input.env, nextPlan),
          getRuntimeClinicData(input.env).providerCompPlans.find(
            (plan) =>
              plan.providerSlug === nextPlan.providerSlug &&
              plan.locationSlug === nextPlan.locationSlug &&
              plan.serviceSlug === nextPlan.serviceSlug,
          ) ?? nextPlan)
        : upsertProviderCompPlan(nextPlan);

      sendJson(
        input.response,
        200,
        adminProviderCompPlanResponseSchema.parse({
          ok: true,
          data: {
            compPlan: updated,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid provider comp update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // PRODUCT CRUD ENDPOINTS
  if (input.method === "GET" && input.pathname === "/v1/admin/products") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!isOwnerActor(input.actor) && !canManageLocation(input.actor, "admin.service.manage", locationSlug)) {
      sendError(input.response, 403, "forbidden", "Location catalog access is restricted.");
      return true;
    }

    const clinicData = getRuntimeClinicData(input.env);
    const products = clinicData.catalog.products.filter((p) => p.locationSlug === locationSlug);

    sendJson(input.response, 200, {
      ok: true,
      data: { locationSlug, products },
    });
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/products") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const body = await readJsonBody(input.request, (b) => b as Record<string, any>);
      const locationSlug = body.locationSlug ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
      
      if (!isOwnerActor(input.actor) && !canManageLocation(input.actor, "admin.service.manage", locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location catalog management is restricted.");
        return true;
      }

      const product = {
        id: `prod_${randomUUID()}`,
        slug: normalizeSlug(body.slug || body.name, "Product"),
        locationSlug,
        name: body.name,
        shortDescription: body.shortDescription || "",
        price: {
          currency: body.price?.currency || "CAD",
          amountCents: body.price?.amountCents || 0,
        },
      };

      // Store in runtime state
      const runtimeState = getRuntimeStateRepository();
      const existingProducts = runtimeState.listProductOverrides?.() || [];
      runtimeState.saveProductOverride?.(product);

      sendJson(input.response, 201, {
        ok: true,
        data: { product },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid product request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // UPDATE PRODUCT
  const productMatch = input.pathname.match(/^\/v1\/admin\/products\/([^\/]+)$/);
  if (productMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const body = await readJsonBody(input.request, (b) => b as Record<string, any>);
      const locationSlug = body.locationSlug ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
      
      if (!isOwnerActor(input.actor) && !canManageLocation(input.actor, "admin.service.manage", locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location management is restricted.");
        return true;
      }

      const clinicData = getRuntimeClinicData(input.env);
      const existing = clinicData.catalog.products.find(
        (p: any) => p.slug === productMatch[1] && p.locationSlug === locationSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Product not found.");
        return true;
      }

      const updated = {
        ...(existing as Record<string, any>),
        name: body.name ?? (existing as Record<string, any>).name,
        shortDescription: body.shortDescription ?? body.description ?? (existing as Record<string, any>).shortDescription,
        price: {
          currency: body.currency ?? body.price?.currency ?? (existing as Record<string, any>).price?.currency ?? "CAD",
          amountCents: body.price?.amountCents ?? body.retailAmountCents ?? (existing as Record<string, any>).price?.amountCents ?? 0,
        },
        updatedAt: new Date().toISOString(),
      };

      getRuntimeStateRepository().saveProductOverride(updated as any);

      sendJson(input.response, 200, {
        ok: true,
        data: { product: updated },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid product update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // DELETE PRODUCT
  if (productMatch && input.method === "DELETE") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const requestUrl = buildUrl(input.request, input.env);
    const locationSlug = requestUrl.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    
    if (!isOwnerActor(input.actor) && !canManageLocation(input.actor, "admin.service.manage", locationSlug)) {
      sendError(input.response, 403, "forbidden", "Location management is restricted.");
      return true;
    }

    getRuntimeStateRepository().deleteProductOverride(locationSlug, productMatch[1]);

    sendJson(input.response, 200, { ok: true });
    return true;
  }

  // CUSTOMER CREATE ENDPOINT
  if (input.method === "POST" && input.pathname === "/v1/admin/customers") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const body = await readJsonBody(input.request, (b) => b as Record<string, any>);
      const locationSlug = body.locationSlug ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
      
      if (!isOwnerActor(input.actor) && !canManageLocation(input.actor, "admin.customer.manage", locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location customer management is restricted.");
        return true;
      }

      const customer = {
        id: `cust_${randomUUID()}`,
        email: body.email,
        firstName: body.firstName || "",
        lastName: body.lastName || "",
        phone: body.phone || "",
        locationSlug,
        createdAt: new Date().toISOString(),
      };

      sendJson(input.response, 201, {
        ok: true,
        data: { customer },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid customer request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // BOOKING CREATE ENDPOINT
  if (input.method === "POST" && input.pathname === "/v1/admin/bookings") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }
    try {
      const body = await readJsonBody(input.request, (b) => b as Record<string, any>);
      const locationSlug = body.locationSlug ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
      
      if (!isOwnerActor(input.actor) && !canManageLocation(input.actor, "booking.manage.location", locationSlug)) {
        sendError(input.response, 403, "forbidden", "Booking management is restricted.");
        return true;
      }

      // Validate required fields
      if (!body.customerId || !body.serviceSlug || !body.providerSlug || !body.startTime) {
        sendError(input.response, 400, "validation_error", "Missing required fields: customerId, serviceSlug, providerSlug, startTime");
        return true;
      }

      // Get clinic data for validation
      const clinicData = getRuntimeClinicData(input.env);
      
      // Verify service exists
      const service = clinicData.catalog.services.find(
        (s: any) => s.slug === body.serviceSlug && s.locationSlug === locationSlug
      );
      if (!service) {
        sendError(input.response, 404, "not_found", "Service not found.");
        return true;
      }

      // Verify provider exists
      const provider = clinicData.providers.find(
        (p: any) => p.slug === body.providerSlug && p.locationSlug === locationSlug
      );
      if (!provider) {
        sendError(input.response, 404, "not_found", "Provider not found.");
        return true;
      }

      // Generate booking ID and reference
      const bookingId = randomUUID();
      const bookingRef = `BK${Date.now().toString(36).toUpperCase()}`;
      const now = new Date().toISOString();

      // Calculate end time based on service duration
      const startTime = new Date(body.startTime);
      const durationMinutes = body.durationMinutes || service.durationMinutes || 60;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      // Create booking record
      const booking = {
        id: bookingId,
        reference: bookingRef,
        customerId: body.customerId,
        locationSlug,
        serviceSlug: body.serviceSlug,
        serviceName: service.name,
        providerSlug: body.providerSlug,
        providerName: provider.name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes,
        status: body.status || "confirmed",
        notes: body.notes || "",
        price: {
          currency: service.price?.currency || "CAD",
          amountCents: body.amountCents || service.price?.retailAmountCents || 0,
          isMemberPrice: body.isMemberPrice || false,
        },
        roomSlug: body.roomSlug || null,
        machineSlug: body.machineSlug || null,
        paymentStatus: body.paymentStatus || "pending",
        source: "admin",
        createdBy: input.actor.userId,
        createdAt: now,
        updatedAt: now,
        remindersSent: {
          confirmation: false,
          dayBefore: false,
          hourBefore: false,
        },
      };

      // Persist booking
      await input.repositories.commerce.bookings.save(booking);

      // Record audit
      recordAdminAction({
        actor: input.actor,
        action: "booking.create",
        resourceType: "booking",
        resourceId: bookingId,
        locationSlug,
        metadata: { 
          customerId: body.customerId,
          serviceSlug: body.serviceSlug,
          startTime: booking.startTime,
        },
      });

      sendJson(input.response, 201, {
        ok: true,
        data: { booking },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid booking request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // PROVIDER UPDATE ENDPOINT
  const providerMatch = input.pathname.match(/^\/v1\/admin\/providers\/([^\/]+)$/);
  if (providerMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const body = await readJsonBody(input.request, (b) => b as Record<string, any>);
      const locationSlug = body.locationSlug ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
      
      if (!isOwnerActor(input.actor) && !canManageLocation(input.actor, "admin.provider.manage", locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location provider management is restricted.");
        return true;
      }

      const clinicData = getRuntimeClinicData(input.env);
      const existing = clinicData.providers.find(
        (p) => p.slug === providerMatch[1] && p.locationSlug === locationSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Provider not found.");
        return true;
      }

      const updated = {
        ...existing,
        commissionPercent: body.commissionPercent ?? (existing as Record<string, any>).commissionPercent,
        serviceSlugs: body.serviceSlugs ?? (existing as Record<string, any>).serviceSlugs,
      };

      getRuntimeStateRepository().saveProviderOverride(updated);

      sendJson(input.response, 200, {
        ok: true,
        data: { provider: updated },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid provider update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
