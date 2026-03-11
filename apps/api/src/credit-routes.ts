import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminCreditGrantRequestSchema,
  adminCreditGrantResponseSchema,
  myCreditsResponseSchema,
} from "../../../packages/contracts/src";
import {
  buildCreditBalanceView,
  createCreditEntry,
  type AppActor,
} from "../../../packages/domain/src";

import { getRuntimeClinicData } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

export const handleCreditRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  if (input.method === "GET" && input.pathname === "/v1/me/credits") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

    const clinicData = getRuntimeClinicData(input.env);
    const credits = buildCreditBalanceView({
      entries: await input.repositories.commerce.credits.listAll(),
      plans: clinicData.membershipPlans,
      subscriptions: await input.repositories.commerce.memberships.listSubscriptionsForActor({
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
      }),
      usageRecords: await input.repositories.commerce.memberships.listAllUsageRecords(),
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
    });

    sendJson(
      input.response,
      200,
      myCreditsResponseSchema.parse({
        ok: true,
        data: {
          credits,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/credits/grants") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminCreditGrantRequestSchema.parse(body),
      );
      const entry = await input.repositories.commerce.credits.saveEntry(
        createCreditEntry({
          locationSlug: payload.locationSlug,
          type: "grant",
          amount: payload.amount,
          customerEmail: payload.customerEmail,
          actorUserId: payload.actorUserId,
          note: payload.note,
          grantedByUserId: input.actor.userId,
        }),
      );

      sendJson(
        input.response,
        201,
        adminCreditGrantResponseSchema.parse({
          ok: true,
          data: {
            entry,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid credit grant request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
