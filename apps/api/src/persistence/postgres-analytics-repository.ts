import type { Pool } from "pg";

import type { OperationalMetricEventRecord } from "../../../../packages/domain/src";

type Queryable = Pick<Pool, "query">;

interface LocationScopeRow {
  brand_id: string;
  location_id: string;
}

const resolveLocationScope = async (
  db: Queryable,
  locationSlug: string,
): Promise<LocationScopeRow> => {
  const result = await db.query<LocationScopeRow>(
    `
      select brand_id, id as location_id
      from location
      where slug = $1
      order by created_at desc
      limit 2
    `,
    [locationSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Location ${locationSlug} is not available in Postgres analytics persistence.`);
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const parseOperationalMetricEvent = (value: unknown): OperationalMetricEventRecord =>
  value as OperationalMetricEventRecord;

export const createPostgresAnalyticsRepository = (db: Queryable) => ({
  saveEvent: async (event: OperationalMetricEventRecord): Promise<void> => {
    const scope = await resolveLocationScope(db, event.locationSlug);

    await db.query(
      `
        insert into analytics_operational_metric_projection (
          id,
          brand_id,
          location_id,
          location_slug,
          event_type,
          service_slug,
          machine_slug,
          provider_slug,
          actor_user_id,
          customer_email,
          reference_id,
          source_order_id,
          occurred_at,
          metadata,
          record
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb
        )
        on conflict (id) do update
        set
          event_type = excluded.event_type,
          service_slug = excluded.service_slug,
          machine_slug = excluded.machine_slug,
          provider_slug = excluded.provider_slug,
          actor_user_id = excluded.actor_user_id,
          customer_email = excluded.customer_email,
          reference_id = excluded.reference_id,
          source_order_id = excluded.source_order_id,
          occurred_at = excluded.occurred_at,
          metadata = excluded.metadata,
          record = excluded.record
      `,
      [
        event.id,
        scope.brand_id,
        scope.location_id,
        event.locationSlug,
        event.eventType,
        event.serviceSlug ?? null,
        event.machineSlug ?? null,
        event.providerSlug ?? null,
        event.actorUserId ?? null,
        event.customerEmail ?? null,
        event.referenceId ?? null,
        event.sourceOrderId ?? null,
        event.occurredAt,
        JSON.stringify(event.metadata),
        JSON.stringify(event),
      ],
    );
  },
  listAll: async (): Promise<OperationalMetricEventRecord[]> => {
    const result = await db.query<{ record: OperationalMetricEventRecord }>(
      `
        select record
        from analytics_operational_metric_projection
        order by occurred_at desc
      `,
    );

    return result.rows.map((row) => parseOperationalMetricEvent(row.record));
  },
  hasEvent: async (input: {
    eventType: OperationalMetricEventRecord["eventType"];
    sourceOrderId?: string;
    referenceId?: string;
  }): Promise<boolean> => {
    const result = await db.query<{ exists: boolean }>(
      `
        select true as exists
        from analytics_operational_metric_projection
        where event_type = $1
          and (
            ($2::text is null and source_order_id is null)
            or source_order_id = $2
          )
          and (
            ($3::text is null and reference_id is null)
            or reference_id = $3
          )
        limit 1
      `,
      [input.eventType, input.sourceOrderId ?? null, input.referenceId ?? null],
    );

    return (result.rowCount ?? 0) > 0;
  },
});
