import type { Pool } from "pg";

import type {
  IdempotentResponseRecord,
  ReliabilityRepository,
} from "./reliability-repository";

type Queryable = Pick<Pool, "query">;

const IDEMPOTENCY_TTL_DAYS = 7;

const buildExpiryTimestamp = (): string => {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + IDEMPOTENCY_TTL_DAYS);
  return expiresAt.toISOString();
};

export const createPostgresReliabilityRepository = (
  db: Queryable,
): ReliabilityRepository => ({
  idempotency: {
    get: async (
      scope: string,
      key: string,
    ): Promise<IdempotentResponseRecord | undefined> => {
      const result = await db.query<{
        response_status: number | null;
        response_body: unknown;
      }>(
        `
          select response_status, response_body
          from idempotency_key
          where scope_key = $1
            and idempotency_key = $2
            and response_status is not null
            and response_body is not null
            and expires_at > now()
          limit 1
        `,
        [scope, key],
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      return {
        statusCode: result.rows[0].response_status ?? 200,
        payload: result.rows[0].response_body,
      };
    },
    save: async (input): Promise<void> => {
      await db.query(
        `
          insert into idempotency_key (
            scope_key,
            idempotency_key,
            request_hash,
            response_status,
            response_body,
            expires_at
          )
          values ($1, $2, $3, $4, $5::jsonb, $6)
          on conflict (scope_key, idempotency_key) do update
          set
            response_status = excluded.response_status,
            response_body = excluded.response_body,
            expires_at = excluded.expires_at
        `,
        [
          input.scope,
          input.key,
          "repository-managed",
          input.response.statusCode,
          JSON.stringify(input.response.payload),
          buildExpiryTimestamp(),
        ],
      );
    },
  },
  webhookEvents: {
    hasProcessed: async (input): Promise<boolean> => {
      const result = await db.query<{ exists: boolean }>(
        `
          select true as exists
          from integration_processed_webhook_event_projection
          where source = $1
            and event_id = $2
          limit 1
        `,
        [input.source, input.eventId],
      );

      return (result.rowCount ?? 0) > 0;
    },
    markProcessed: async (input): Promise<void> => {
      await db.query(
        `
          insert into integration_processed_webhook_event_projection (
            source,
            event_id,
            processed_at
          )
          values ($1, $2, now())
          on conflict (source, event_id) do nothing
        `,
        [input.source, input.eventId],
      );
    },
  },
});
