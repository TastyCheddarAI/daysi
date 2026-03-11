import type { ServerResponse } from "node:http";

import {
  publicAnalyticsEventRequestSchema,
  publicAnalyticsEventResponseSchema,
} from "../../../packages/contracts/src";
import { createOperationalMetricEvent } from "../../../packages/domain/src";

import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";

export const handlePublicAnalyticsRoutes = async (input: {
  method: string;
  pathname: string;
  request: Parameters<typeof readJsonBody>[0];
  response: ServerResponse;
  env: AppEnv;
  repositories: AppRepositories;
}): Promise<boolean> => {
  if (input.method !== "POST" || input.pathname !== "/v1/public/events") {
    return false;
  }

  try {
    const payload = await readJsonBody(input.request, (body) =>
      publicAnalyticsEventRequestSchema.parse(body),
    );
    const event = createOperationalMetricEvent({
      eventType: payload.eventType,
      locationSlug: payload.locationSlug ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG,
      customerEmail: payload.customerEmail,
      occurredAt: payload.occurredAt,
      metadata: {
        ...payload.metadata,
        pagePath: payload.pagePath,
        referrer: payload.referrer ?? null,
        sessionId: payload.sessionId,
        userAgent: input.request.headers["user-agent"] ?? null,
      },
    });

    await input.repositories.analytics.saveEvent(event);

    sendJson(
      input.response,
      202,
      publicAnalyticsEventResponseSchema.parse({
        ok: true,
        data: {
          eventId: event.id,
          eventType: event.eventType,
        },
      }),
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid analytics event.";
    sendError(input.response, 400, "validation_error", message);
    return true;
  }
};
