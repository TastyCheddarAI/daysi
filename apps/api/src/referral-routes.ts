import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminReferralProgramCreateRequestSchema,
  adminReferralProgramResponseSchema,
  adminReferralProgramsResponseSchema,
  adminReferralProgramUpdateRequestSchema,
  applyReferralCodeRequestSchema,
  applyReferralCodeResponseSchema,
  myReferralResponseSchema,
} from "../../../packages/contracts/src";
import {
  can,
  canManageLocation,
  createReferralRelationship,
  createReferralProgram,
  createReferralRewardEvent,
  findReferralCodeByValue,
  updateReferralProgram,
  type AppActor,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import { getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordCustomerEvent } from "./customer-context-support";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import { buildReferralOverviewForActor, recordReferralRewardEvent } from "./referral-support";

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const requireCustomerActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.includes("customer");

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const matchAdminReferralProgramPath = (
  pathname: string,
): { programId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "referrals" &&
    segments[3] === "programs"
  ) {
    return {
      programId: segments[4],
    };
  }

  return null;
};

const ensureScopedAdminAccess = (
  actor: AppActor | null,
  locationSlug: string,
): boolean => !!actor && canManageLocation(actor, "admin.referral.manage", locationSlug);

const getLocationOrError = (
  env: AppEnv,
  locationSlug: string,
): { slug: string; enabledModules: string[] } | null => {
  const location = getRuntimeTenantContext(env).locations.find(
    (entry) => entry.slug === locationSlug,
  );

  if (!location) {
    return null;
  }

  return {
    slug: location.slug,
    enabledModules: location.enabledModules,
  };
};

const ensureReferralFeatureEnabled = (env: AppEnv, locationSlug: string): boolean =>
  !!getLocationOrError(env, locationSlug)?.enabledModules.includes("referrals");

export const handleReferralRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const url = buildUrl(input.request, input.env);

  if (input.method === "GET" && input.pathname === "/v1/me/referral") {
    if (!requireCustomerActor(input.actor) || !can(input.actor, "referral.read.self")) {
      sendError(input.response, 403, "forbidden", "Customer referral access is required.");
      return true;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!getLocationOrError(input.env, locationSlug)) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }
    if (!ensureReferralFeatureEnabled(input.env, locationSlug)) {
      sendError(input.response, 409, "conflict", "Referrals are not enabled at this location.");
      return true;
    }

    const overview = await buildReferralOverviewForActor({
      repositories: input.repositories,
      actor: input.actor,
      locationSlug,
      ensureCode: true,
    });

    sendJson(
      input.response,
      200,
      myReferralResponseSchema.parse({
        ok: true,
        data: {
          overview,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/referrals/apply") {
    if (!requireCustomerActor(input.actor) || !can(input.actor, "referral.apply.self")) {
      sendError(input.response, 403, "forbidden", "Customer referral access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        applyReferralCodeRequestSchema.parse(body),
      );
      if (!getLocationOrError(input.env, payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      if (!ensureReferralFeatureEnabled(input.env, payload.locationSlug)) {
        sendError(input.response, 409, "conflict", "Referrals are not enabled at this location.");
        return true;
      }

      const referralCode = findReferralCodeByValue(
        await input.repositories.growth.referrals.listCodes(payload.locationSlug),
        {
        locationSlug: payload.locationSlug,
        code: payload.code,
        },
      );
      if (!referralCode) {
        sendError(input.response, 404, "not_found", "Referral code not found.");
        return true;
      }

      const program = await input.repositories.growth.referrals.getProgram(referralCode.programId);
      if (!program || program.status !== "active") {
        sendError(input.response, 409, "conflict", "Referral program is not active.");
        return true;
      }

      const relationship = createReferralRelationship({
        program,
        referralCode,
        actor: input.actor,
        existingRelationships: await input.repositories.growth.referrals.listRelationships(
          payload.locationSlug,
        ),
      });
      await input.repositories.growth.referrals.saveRelationship(relationship);
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: relationship.locationSlug,
        customerEmail: relationship.refereeEmail,
        actorUserId: relationship.refereeUserId,
        source: "referral",
        eventType: "referral.code_applied",
        payload: {
          relationshipId: relationship.id,
          referralCode: relationship.referralCode,
          referrerEmail: relationship.referrerEmail,
        },
        occurredAt: relationship.createdAt,
      });

      const rewardEvents = program.referredReward
        ? [
            await recordReferralRewardEvent(
              input.repositories,
              createReferralRewardEvent({
                programId: program.id,
                relationshipId: relationship.id,
                locationSlug: relationship.locationSlug,
                recipient: "referee",
                recipientUserId: input.actor.userId,
                recipientEmail: input.actor.email ?? relationship.refereeEmail,
                reward: program.referredReward,
              }),
            ),
          ]
        : [];
      const overview = await buildReferralOverviewForActor({
        repositories: input.repositories,
        actor: input.actor,
        locationSlug: payload.locationSlug,
        ensureCode: true,
      });

      sendJson(
        input.response,
        201,
        applyReferralCodeResponseSchema.parse({
          ok: true,
          data: {
            relationship,
            rewardEvents,
            overview,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid referral request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/referrals/programs") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (locationSlug && !ensureScopedAdminAccess(actor, locationSlug)) {
      sendError(input.response, 403, "forbidden", "Location referral access is restricted.");
      return true;
    }

    const programs = (await input.repositories.growth.referrals.listPrograms(
      locationSlug ?? undefined,
    )).filter((program) =>
      locationSlug
        ? program.locationSlug === locationSlug
        : actor.roles.includes("owner")
          ? true
          : actor.locationScopes.includes(program.locationSlug),
    );

    sendJson(
      input.response,
      200,
      adminReferralProgramsResponseSchema.parse({
        ok: true,
        data: {
          programs,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/referrals/programs") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminReferralProgramCreateRequestSchema.parse(body),
      );
      if (!getLocationOrError(input.env, payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location referral access is restricted.");
        return true;
      }

      const program = createReferralProgram({
        locationSlug: payload.locationSlug,
        name: payload.name,
        status: payload.status,
        codePrefix: payload.codePrefix,
        referredReward: payload.referredReward,
        advocateReward: payload.advocateReward,
        secondLevelReward: payload.secondLevelReward,
      });
      await input.repositories.growth.referrals.saveProgram(program);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: program.locationSlug,
        action: "referral.program.created",
        entityType: "referral_program",
        entityId: program.id,
        summary: `Created referral program ${program.name}`,
        metadata: {
          status: program.status,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        201,
        adminReferralProgramResponseSchema.parse({
          ok: true,
          data: {
            program,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid referral program request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const programMatch = matchAdminReferralProgramPath(input.pathname);
  if (programMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminReferralProgramUpdateRequestSchema.parse(body),
      );
      const existing = await input.repositories.growth.referrals.getProgram(programMatch.programId);
      if (!existing) {
        sendError(input.response, 404, "not_found", "Referral program not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, existing.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location referral access is restricted.");
        return true;
      }

      const program = updateReferralProgram({
        program: existing,
        name: payload.name,
        status: payload.status,
        codePrefix: payload.codePrefix,
        referredReward: payload.referredReward,
        advocateReward: payload.advocateReward,
        secondLevelReward: payload.secondLevelReward,
      });
      await input.repositories.growth.referrals.saveProgram(program);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: program.locationSlug,
        action: "referral.program.updated",
        entityType: "referral_program",
        entityId: program.id,
        summary: `Updated referral program ${program.name}`,
        metadata: {
          status: program.status,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        adminReferralProgramResponseSchema.parse({
          ok: true,
          data: {
            program,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid referral program update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
