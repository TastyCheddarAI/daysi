import type { Pool } from "pg";

import type {
  CustomerEventRecord,
  CustomerNote,
  CustomerTag,
  WaitlistEntryRecord,
} from "../../../../packages/domain/src";

import type { StoredWaitlistEntryRecord } from "./engagement-repository";

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
    throw new Error(`Location ${locationSlug} is not available in Postgres engagement persistence.`);
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const parseCustomerEvent = (value: unknown): CustomerEventRecord =>
  value as CustomerEventRecord;
const parseCustomerNote = (value: unknown): CustomerNote => value as CustomerNote;
const parseCustomerTag = (value: unknown): CustomerTag => value as CustomerTag;
const parseWaitlistEntry = (value: unknown): WaitlistEntryRecord =>
  value as WaitlistEntryRecord;

const upsertWaitlistEntry = async (
  db: Queryable,
  waitlistEntry: WaitlistEntryRecord,
  managementToken: string,
): Promise<void> => {
  const scope = await resolveLocationScope(db, waitlistEntry.locationSlug);

  await db.query(
    `
      insert into engagement_waitlist_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        actor_user_id,
        management_token,
        service_slug,
        service_variant_slug,
        service_name,
        customer_email,
        customer_first_name,
        customer_last_name,
        customer_phone,
        preferred_provider_slug,
        preferred_pricing_mode,
        requested_from_date,
        requested_to_date,
        status,
        notes,
        fulfilled_by_booking_id,
        status_history,
        record,
        created_at,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21::jsonb, $22::jsonb, $23, $24
      )
      on conflict (id) do update
      set
        actor_user_id = excluded.actor_user_id,
        management_token = excluded.management_token,
        service_slug = excluded.service_slug,
        service_variant_slug = excluded.service_variant_slug,
        service_name = excluded.service_name,
        customer_email = excluded.customer_email,
        customer_first_name = excluded.customer_first_name,
        customer_last_name = excluded.customer_last_name,
        customer_phone = excluded.customer_phone,
        preferred_provider_slug = excluded.preferred_provider_slug,
        preferred_pricing_mode = excluded.preferred_pricing_mode,
        requested_from_date = excluded.requested_from_date,
        requested_to_date = excluded.requested_to_date,
        status = excluded.status,
        notes = excluded.notes,
        fulfilled_by_booking_id = excluded.fulfilled_by_booking_id,
        status_history = excluded.status_history,
        record = excluded.record,
        updated_at = excluded.updated_at
    `,
    [
      waitlistEntry.id,
      scope.brand_id,
      scope.location_id,
      waitlistEntry.locationSlug,
      waitlistEntry.actorUserId ?? null,
      managementToken,
      waitlistEntry.serviceSlug,
      waitlistEntry.serviceVariantSlug,
      waitlistEntry.serviceName,
      waitlistEntry.customer.email,
      waitlistEntry.customer.firstName,
      waitlistEntry.customer.lastName,
      waitlistEntry.customer.phone ?? null,
      waitlistEntry.preferredProviderSlug ?? null,
      waitlistEntry.preferredPricingMode,
      waitlistEntry.requestedWindow.fromDate,
      waitlistEntry.requestedWindow.toDate,
      waitlistEntry.status,
      waitlistEntry.notes ?? null,
      waitlistEntry.fulfilledByBookingId ?? null,
      JSON.stringify(waitlistEntry.statusHistory),
      JSON.stringify(waitlistEntry),
      waitlistEntry.createdAt,
      waitlistEntry.updatedAt,
    ],
  );
};

export const createPostgresEngagementRepository = (db: Queryable) => ({
  customerEvents: {
    save: async (event: CustomerEventRecord): Promise<void> => {
      const scope = await resolveLocationScope(db, event.locationSlug);

      await db.query(
        `
          insert into engagement_customer_event_projection (
            id,
            brand_id,
            location_id,
            location_slug,
            actor_user_id,
            customer_email,
            customer_name,
            source,
            event_type,
            occurred_at,
            payload,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb
          )
          on conflict (id) do update
          set
            actor_user_id = excluded.actor_user_id,
            customer_email = excluded.customer_email,
            customer_name = excluded.customer_name,
            source = excluded.source,
            event_type = excluded.event_type,
            occurred_at = excluded.occurred_at,
            payload = excluded.payload,
            record = excluded.record
        `,
        [
          event.id,
          scope.brand_id,
          scope.location_id,
          event.locationSlug,
          event.actorUserId ?? null,
          event.customerEmail,
          event.customerName ?? null,
          event.source,
          event.eventType,
          event.occurredAt,
          JSON.stringify(event.payload),
          JSON.stringify(event),
        ],
      );
    },
    listAll: async (): Promise<CustomerEventRecord[]> => {
      const result = await db.query<{ record: CustomerEventRecord }>(
        `
          select record
          from engagement_customer_event_projection
          order by occurred_at desc
        `,
      );

      return result.rows.map((row) => parseCustomerEvent(row.record));
    },
  },
  customerNotes: {
    save: async (note: CustomerNote): Promise<void> => {
      const scope = await resolveLocationScope(db, note.locationSlug);

      await db.query(
        `
          insert into engagement_customer_note_projection (
            id,
            brand_id,
            location_id,
            location_slug,
            customer_email,
            customer_name,
            body,
            created_by_user_id,
            created_by_email,
            created_at,
            updated_at,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb
          )
          on conflict (id) do update
          set
            customer_email = excluded.customer_email,
            customer_name = excluded.customer_name,
            body = excluded.body,
            created_by_user_id = excluded.created_by_user_id,
            created_by_email = excluded.created_by_email,
            updated_at = excluded.updated_at,
            record = excluded.record
        `,
        [
          note.id,
          scope.brand_id,
          scope.location_id,
          note.locationSlug,
          note.customerEmail,
          note.customerName ?? null,
          note.body,
          note.createdByUserId ?? null,
          note.createdByEmail ?? null,
          note.createdAt,
          note.updatedAt,
          JSON.stringify(note),
        ],
      );
    },
    update: async (note: CustomerNote): Promise<void> => {
      const scope = await resolveLocationScope(db, note.locationSlug);

      await db.query(
        `
          update engagement_customer_note_projection
          set
            body = $2,
            customer_email = $3,
            customer_name = $4,
            created_by_user_id = $5,
            created_by_email = $6,
            updated_at = $7,
            record = $8::jsonb
          where id = $1
            and brand_id = $9
            and location_id = $10
        `,
        [
          note.id,
          note.body,
          note.customerEmail,
          note.customerName ?? null,
          note.createdByUserId ?? null,
          note.createdByEmail ?? null,
          note.updatedAt,
          JSON.stringify(note),
          scope.brand_id,
          scope.location_id,
        ],
      );
    },
    get: async (noteId: string): Promise<CustomerNote | undefined> => {
      const result = await db.query<{ record: CustomerNote }>(
        `
          select record
          from engagement_customer_note_projection
          where id = $1
          limit 1
        `,
        [noteId],
      );

      return result.rows[0] ? parseCustomerNote(result.rows[0].record) : undefined;
    },
    listAll: async (): Promise<CustomerNote[]> => {
      const result = await db.query<{ record: CustomerNote }>(
        `
          select record
          from engagement_customer_note_projection
          order by updated_at desc
        `,
      );

      return result.rows.map((row) => parseCustomerNote(row.record));
    },
  },
  customerTags: {
    save: async (tag: CustomerTag): Promise<void> => {
      const scope = await resolveLocationScope(db, tag.locationSlug);

      await db.query(
        `
          insert into engagement_customer_tag_projection (
            id,
            brand_id,
            location_id,
            location_slug,
            customer_email,
            label,
            created_by_user_id,
            created_by_email,
            created_at,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
          )
          on conflict (id) do update
          set
            customer_email = excluded.customer_email,
            label = excluded.label,
            created_by_user_id = excluded.created_by_user_id,
            created_by_email = excluded.created_by_email,
            record = excluded.record
        `,
        [
          tag.id,
          scope.brand_id,
          scope.location_id,
          tag.locationSlug,
          tag.customerEmail,
          tag.label,
          tag.createdByUserId ?? null,
          tag.createdByEmail ?? null,
          tag.createdAt,
          JSON.stringify(tag),
        ],
      );
    },
    get: async (tagId: string): Promise<CustomerTag | undefined> => {
      const result = await db.query<{ record: CustomerTag }>(
        `
          select record
          from engagement_customer_tag_projection
          where id = $1
          limit 1
        `,
        [tagId],
      );

      return result.rows[0] ? parseCustomerTag(result.rows[0].record) : undefined;
    },
    delete: async (tagId: string): Promise<void> => {
      await db.query(
        `
          delete from engagement_customer_tag_projection
          where id = $1
        `,
        [tagId],
      );
    },
    listAll: async (): Promise<CustomerTag[]> => {
      const result = await db.query<{ record: CustomerTag }>(
        `
          select record
          from engagement_customer_tag_projection
          order by label asc
        `,
      );

      return result.rows.map((row) => parseCustomerTag(row.record));
    },
  },
  waitlist: {
    save: async (waitlistEntry: WaitlistEntryRecord, managementToken: string) => {
      await upsertWaitlistEntry(db, waitlistEntry, managementToken);
    },
    update: async (waitlistEntry: WaitlistEntryRecord) => {
      const existing = await db.query<{ management_token: string }>(
        `
          select management_token
          from engagement_waitlist_projection
          where id = $1
          limit 1
        `,
        [waitlistEntry.id],
      );

      if (existing.rowCount === 0) {
        throw new Error("Waitlist entry not found in Postgres engagement persistence.");
      }

      await upsertWaitlistEntry(db, waitlistEntry, existing.rows[0].management_token);
    },
    getStored: async (
      waitlistEntryId: string,
    ): Promise<StoredWaitlistEntryRecord | undefined> => {
      const result = await db.query<{
        management_token: string;
        record: WaitlistEntryRecord;
      }>(
        `
          select management_token, record
          from engagement_waitlist_projection
          where id = $1
          limit 1
        `,
        [waitlistEntryId],
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      return {
        managementToken: result.rows[0].management_token,
        waitlistEntry: parseWaitlistEntry(result.rows[0].record),
      };
    },
    listAll: async (): Promise<WaitlistEntryRecord[]> => {
      const result = await db.query<{ record: WaitlistEntryRecord }>(
        `
          select record
          from engagement_waitlist_projection
          order by updated_at desc
        `,
      );

      return result.rows.map((row) => parseWaitlistEntry(row.record));
    },
    listForActor: async (input: {
      actorUserId?: string;
      actorEmail?: string;
    }): Promise<WaitlistEntryRecord[]> => {
      const actorEmail = input.actorEmail?.toLowerCase() ?? null;
      const result = await db.query<{ record: WaitlistEntryRecord }>(
        `
          select record
          from engagement_waitlist_projection
          where ($1::text is not null and actor_user_id = $1)
             or ($2::text is not null and lower(customer_email) = $2)
          order by updated_at desc
        `,
        [input.actorUserId ?? null, actorEmail],
      );

      return result.rows.map((row) => parseWaitlistEntry(row.record));
    },
  },
});
