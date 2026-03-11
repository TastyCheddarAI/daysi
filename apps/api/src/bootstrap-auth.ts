import { randomUUID } from "node:crypto";

import { hash, compare } from "bcrypt";
import {
  actorSchema,
  type Actor,
  type SessionExchangeRequest,
} from "../../../packages/contracts/src";
import { resolvePermissions } from "../../../packages/domain/src";
import type { ConfigurationRepository } from "./persistence/configuration-repository";

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return compare(password, hash);
};

const encodeBootstrapToken = (actor: Actor): string =>
  Buffer.from(JSON.stringify(actor), "utf8").toString("base64url");

const decodeBootstrapToken = (token: string): Actor | null => {
  try {
    const payload = Buffer.from(token, "base64url").toString("utf8");
    return actorSchema.parse(JSON.parse(payload));
  } catch {
    return null;
  }
};

const getScopedStaffRole = (actor: Pick<Actor, "roles">): "admin" | "staff" | null => {
  if (actor.roles.includes("owner")) {
    return null;
  }

  if (actor.roles.includes("admin")) {
    return "admin";
  }

  if (actor.roles.includes("staff")) {
    return "staff";
  }

  return null;
};

export const createBootstrapSession = async (
  request: SessionExchangeRequest,
  defaultLocationSlug: string,
  accessAssignments: ConfigurationRepository["accessAssignments"],
): Promise<{ sessionToken: string; actor: Actor; sessionMode: "bootstrap" }> => {
  const roles = [request.requestedRole];
  const isPrivilegedRole = ["owner", "admin", "staff"].includes(request.requestedRole);
  const requestedScopedRole =
    request.requestedRole === "admin" || request.requestedRole === "staff"
      ? request.requestedRole
      : null;

  if (isPrivilegedRole && !request.email) {
    throw new Error(`Email is required for ${request.requestedRole} authentication.`);
  }

  // Require password for privileged roles
  if (isPrivilegedRole && !request.password) {
    throw new Error(`Password is required for ${request.requestedRole} access.`);
  }

  const assignment = requestedScopedRole
    ? await accessAssignments.findByEmailAndRole({
        email: request.email!,
        role: requestedScopedRole,
      })
    : undefined;
  
  if (requestedScopedRole && !assignment) {
    throw new Error(`Invalid credentials.`);
  }

  // Verify password for privileged roles
  if (isPrivilegedRole) {
    const targetAssignment = assignment || await accessAssignments.findByEmailAndRole({
      email: request.email!,
      role: "owner",
    });
    
    if (!targetAssignment?.passwordHash) {
      throw new Error(`Password not configured. Contact system administrator.`);
    }
    
    const isValidPassword = await verifyPassword(request.password!, targetAssignment.passwordHash);
    if (!isValidPassword) {
      throw new Error(`Invalid credentials.`);
    }
  }

  const requestedLocationScopes = request.locationScopes?.length
    ? [...new Set(request.locationScopes)]
    : undefined;
  if (
    assignment?.locationScopes.length &&
    requestedLocationScopes?.some(
      (locationSlug) => !assignment.locationScopes.includes(locationSlug),
    )
  ) {
    throw new Error(
      `Requested location scopes exceed the assigned ${requestedScopedRole} scope.`,
    );
  }
  const locationScopes = requestedLocationScopes?.length
    ? requestedLocationScopes
    : assignment?.locationScopes.length
      ? [...new Set(assignment.locationScopes)]
      : [defaultLocationSlug];
  const actor: Actor = {
    userId: `usr_${randomUUID()}`,
    tenantSlug: request.tenantSlug,
    email: request.email,
    displayName: request.displayName,
    roles,
    locationScopes,
    permissions: resolvePermissions(roles),
  };

  return {
    sessionToken: encodeBootstrapToken(actor),
    actor,
    sessionMode: "bootstrap",
  };
};

export const validateBootstrapActorAccess = async (
  actor: Actor,
  accessAssignments: ConfigurationRepository["accessAssignments"],
): Promise<boolean> => {
  const scopedStaffRole = getScopedStaffRole(actor);
  if (!scopedStaffRole) {
    return true;
  }

  if (!actor.email) {
    return false;
  }

  const assignment = await accessAssignments.findByEmailAndRole({
    email: actor.email,
    role: scopedStaffRole,
  });
  if (!assignment) {
    return false;
  }

  return actor.locationScopes.every((locationSlug) =>
    assignment.locationScopes.includes(locationSlug),
  );
};

export const getActorFromAuthHeader = (
  authorizationHeader: string | undefined,
): Actor | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return decodeBootstrapToken(token);
};
