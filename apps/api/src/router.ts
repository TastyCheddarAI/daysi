import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  healthResponseSchema,
  meResponseSchema,
  platformConfigResponseSchema,
  sessionExchangeRequestSchema,
  sessionExchangeResponseSchema,
  tenantLocationsResponseSchema,
} from "../../../packages/contracts/src";
import { getLocationBySlug } from "../../../packages/domain/src";

import { handleAiRoutes } from "./ai-routes";
import { handleAdminConfigRoutes } from "./admin-config-routes";
import {
  createBootstrapSession,
  getActorFromAuthHeader,
  validateBootstrapActorAccess,
} from "./bootstrap-auth";
import {
  handleAvailabilityAndBookingRoutes,
  handleCatalogRoutes,
} from "./booking-routes";
import { handleBusinessProfileRoutes } from "./business-profile-routes";
import { handleCommerceAndMembershipRoutes } from "./commerce-routes";
import { handleCreditRoutes } from "./credit-routes";
import { handleCustomerContextRoutes } from "./customer-context-routes";
import { handleEducationRoutes } from "./education-routes";
import { handleEducationModuleRoutes } from "./education-module-routes";
import { handleLearningRoutes } from "./learning-routes";
import { getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import { handleOnboardingAndImportRoutes } from "./onboarding-routes";
import { handleServicePackageRoutes } from "./package-routes";
import { handlePromotionRoutes } from "./promotion-routes";
import { handleProviderAndAdminRoutes } from "./provider-routes";
import { handlePublicAnalyticsRoutes } from "./public-analytics-routes";
import { handleReferralRoutes } from "./referral-routes";
import { handleSkinAssessmentRoutes } from "./skin-assessment-routes";
import { handleSupportAndAuditRoutes } from "./support-routes";
import { handleTenantSettingRoutes } from "./tenant-settings-routes";
import { handleTreatmentPlanRoutes } from "./treatment-plan-routes";
import { handleWaitlistRoutes } from "./waitlist-routes";
import { handleImportRoutes } from "./import-routes";
import { handleIntakeFormsRoutes } from "./intake-forms-routes";
import { handleAuditRoutes } from "./audit-routes";
import type { AppRepositories } from "./persistence/app-repositories";

const matchTenantLocationsPath = (pathname: string): { tenantSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 4) {
    return null;
  }

  if (segments[0] !== "v1" || segments[1] !== "tenants" || segments[3] !== "locations") {
    return null;
  }

  return {
    tenantSlug: segments[2],
  };
};

export const routeRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  env: AppEnv,
  repositories: AppRepositories,
): Promise<void> => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );
  const method = request.method ?? "GET";
  const tenantContext = getRuntimeTenantContext(env);
  const rawActor = getActorFromAuthHeader(request.headers.authorization);
  const actor =
    rawActor &&
    (await validateBootstrapActorAccess(rawActor, repositories.configuration.accessAssignments))
      ? rawActor
      : null;

  if (method === "GET" && url.pathname === "/v1/health") {
    sendJson(
      response,
      200,
      healthResponseSchema.parse({
        ok: true,
        data: {
          service: "api",
          status: "ok",
          apiVersion: "v1",
          environment: env.DAYSI_ENV,
          time: new Date().toISOString(),
        },
      }),
    );
    return;
  }

  if (method === "GET" && url.pathname === "/v1/platform/config") {
    sendJson(
      response,
      200,
      platformConfigResponseSchema.parse({
        ok: true,
        data: {
          brandName: tenantContext.brandName,
          brandSlug: tenantContext.brandSlug,
          primaryDomain: tenantContext.primaryDomain,
          apiVersion: "v1",
          environment: tenantContext.environment,
          organizations: tenantContext.organizations,
          locations: tenantContext.locations,
        },
      }),
    );
    return;
  }

  const tenantLocationsMatch = matchTenantLocationsPath(url.pathname);
  if (method === "GET" && tenantLocationsMatch) {
    if (tenantLocationsMatch.tenantSlug !== tenantContext.brandSlug) {
      sendError(response, 404, "not_found", "Tenant not found.");
      return;
    }

    sendJson(
      response,
      200,
      tenantLocationsResponseSchema.parse({
        ok: true,
        data: {
          tenantSlug: tenantContext.brandSlug,
          locations: tenantContext.locations,
        },
      }),
    );
    return;
  }

  if (method === "POST" && url.pathname === "/v1/auth/session/exchange") {
    if (!env.DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE) {
      sendError(response, 403, "forbidden", "Bootstrap session exchange is disabled.");
      return;
    }

    try {
      const payload = await readJsonBody(request, (body) =>
        sessionExchangeRequestSchema.parse(body),
      );

      if (!getLocationBySlug(tenantContext, env.DAYSI_DEFAULT_LOCATION_SLUG)) {
        sendError(response, 500, "internal_error", "Default location is not configured.");
        return;
      }

      const session = await createBootstrapSession(
        payload,
        env.DAYSI_DEFAULT_LOCATION_SLUG,
        repositories.configuration.accessAssignments,
      );
      sendJson(response, 200, sessionExchangeResponseSchema.parse({ ok: true, data: session }));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request body.";
      sendError(response, 400, "validation_error", message);
      return;
    }
  }

  // Bootstrap endpoint to create admin access for an email (owner only)
  if (method === "POST" && url.pathname === "/v1/admin/bootstrap-admin") {
    try {
      const payload = await readJsonBody(request, (body) => {
        if (typeof body.email !== "string" || typeof body.ownerSecret !== "string" || typeof body.password !== "string") {
          throw new Error("Invalid request body. Email, ownerSecret, and password are required.");
        }
        if (body.password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        return { 
          email: body.email.toLowerCase(), 
          ownerSecret: body.ownerSecret, 
          password: body.password,
          locationScopes: Array.isArray(body.locationScopes) ? body.locationScopes : undefined,
        };
      });

      // Verify the caller is an owner by checking if they provided a valid owner secret
      // The owner secret is the password of an existing owner
      const assignments = await repositories.configuration.accessAssignments.listAll();
      const ownerAssignment = assignments.find((a) => a.role === "owner");
      
      if (!ownerAssignment?.passwordHash) {
        sendError(response, 403, "forbidden", "No owner configured. Create an owner first.");
        return;
      }

      // Verify the owner secret
      const { verifyPassword } = await import("./bootstrap-auth.js");
      const isValidSecret = await verifyPassword(payload.ownerSecret, ownerAssignment.passwordHash);
      
      if (!isValidSecret) {
        sendError(response, 403, "forbidden", "Invalid owner secret.");
        return;
      }

      // Check if admin already exists
      const existingAdmin = assignments.find((a) => a.role === "admin" && a.email.toLowerCase() === payload.email);
      
      const { hashPassword } = await import("./bootstrap-auth.js");
      const passwordHash = await hashPassword(payload.password);
      const now = new Date().toISOString();

      if (existingAdmin) {
        // Update existing admin with new password
        const updatedAssignment = {
          ...existingAdmin,
          passwordHash,
          updatedAt: now,
        };
        await repositories.configuration.accessAssignments.save(updatedAssignment);
        sendJson(response, 200, {
          ok: true,
          data: { message: "Admin password updated.", email: payload.email },
        });
        return;
      }

      // Create new admin access assignment
      const assignment = {
        id: `assign_${randomUUID()}`,
        email: payload.email,
        role: "admin" as const,
        locationScopes: payload.locationScopes ?? [env.DAYSI_DEFAULT_LOCATION_SLUG],
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      await repositories.configuration.accessAssignments.save(assignment);

      sendJson(response, 201, {
        ok: true,
        data: { message: "Admin access granted.", email: payload.email },
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request.";
      sendError(response, 400, "validation_error", message);
      return;
    }
  }

  // Bootstrap endpoint to create first owner or set password for existing owner
  if (method === "POST" && url.pathname === "/v1/admin/bootstrap-owner") {
    try {
      const payload = await readJsonBody(request, (body) => {
        if (typeof body.email !== "string" || typeof body.secret !== "string" || typeof body.password !== "string") {
          throw new Error("Invalid request body. Email, secret, and password are required.");
        }
        if (body.password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        return { email: body.email.toLowerCase(), secret: body.secret, password: body.password };
      });

      // Simple secret check (should match env var or hardcoded value for bootstrap)
      if (payload.secret !== "daysi-bootstrap-2025") {
        sendError(response, 403, "forbidden", "Invalid bootstrap secret.");
        return;
      }

      // Hash password
      const { hashPassword } = await import("./bootstrap-auth.js");
      const passwordHash = await hashPassword(payload.password);

      // Check if owner already exists
      const assignments = await repositories.configuration.accessAssignments.listAll();
      const existingOwner = assignments.find((a) => a.role === "owner" && a.email.toLowerCase() === payload.email);
      
      if (existingOwner) {
        // Update existing owner with password
        const updatedAssignment = {
          ...existingOwner,
          passwordHash,
          updatedAt: new Date().toISOString(),
        };
        await repositories.configuration.accessAssignments.save(updatedAssignment);
        sendJson(response, 200, {
          ok: true,
          data: { message: "Password set. You can now sign in.", email: payload.email },
        });
        return;
      }

      // Check if ANY owner exists (only allow first owner creation)
      const hasOwner = assignments.some((a) => a.role === "owner");
      if (hasOwner) {
        sendError(response, 409, "conflict", "An owner already exists. Contact existing owner for access.");
        return;
      }

      // Create owner access assignment
      const now = new Date().toISOString();
      const assignment = {
        id: `assign_${randomUUID()}`,
        email: payload.email,
        role: "owner" as const,
        locationScopes: [env.DAYSI_DEFAULT_LOCATION_SLUG],
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      await repositories.configuration.accessAssignments.save(assignment);

      sendJson(response, 201, {
        ok: true,
        data: { message: "Owner access granted. Use your password to sign in.", email: payload.email },
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request.";
      sendError(response, 400, "validation_error", message);
      return;
    }
  }

  if (method === "GET" && url.pathname === "/v1/auth/me") {
    if (!actor) {
      sendError(response, 401, "unauthorized", "Missing or invalid bearer token.");
      return;
    }

    if (actor.tenantSlug !== tenantContext.brandSlug) {
      sendError(response, 403, "forbidden", "Actor tenant does not match this platform.");
      return;
    }

    sendJson(
      response,
      200,
      meResponseSchema.parse({
        ok: true,
        data: {
          actor,
          sessionMode: "bootstrap",
        },
      }),
    );
    return;
  }

  if (handleCatalogRoutes(method, url.pathname, response, env)) {
    return;
  }

  if (
    await handleBusinessProfileRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handlePublicAnalyticsRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleAiRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleEducationRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
    })
  ) {
    return;
  }

  if (
    await handleEducationModuleRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleLearningRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleServicePackageRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleCreditRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleSkinAssessmentRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleTreatmentPlanRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleCustomerContextRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleWaitlistRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleAvailabilityAndBookingRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleCommerceAndMembershipRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handlePromotionRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
    })
  ) {
    return;
  }

  if (
    await handleReferralRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleTenantSettingRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleSupportAndAuditRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleOnboardingAndImportRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleAdminConfigRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleProviderAndAdminRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleImportRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleIntakeFormsRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  if (
    await handleAuditRoutes({
      method,
      pathname: url.pathname,
      request,
      response,
      env,
      actor,
      repositories,
    })
  ) {
    return;
  }

  sendError(response, 404, "not_found", "Route not found.", {
    method,
    pathname: url.pathname,
  });
};
