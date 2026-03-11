import type { Pool } from "pg";

import type { BookingRecord, BookingStatus } from "../../../../packages/domain/src";

import type {
  ReservationWindowRecord,
  StoredBookingRecord,
} from "./commerce-repository";

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
    throw new Error(`Location ${locationSlug} is not available in Postgres booking persistence.`);
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const parseBookingRecord = (value: unknown): BookingRecord => value as BookingRecord;

const upsertBooking = async (
  db: Queryable,
  booking: BookingRecord,
  managementToken: string,
): Promise<void> => {
  const scope = await resolveLocationScope(db, booking.locationSlug);

  await db.query(
    `
      insert into commerce_booking_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        actor_user_id,
        management_token,
        booking_code,
        status,
        source_assessment_id,
        source_treatment_plan_id,
        service_slug,
        service_variant_slug,
        service_name,
        customer_email,
        customer_first_name,
        customer_last_name,
        customer_phone,
        provider_slug,
        provider_name,
        machine_slug,
        machine_name,
        room_slug,
        room_name,
        currency_code,
        retail_amount_cents,
        member_amount_cents,
        final_amount_cents,
        membership_required,
        applied_pricing_mode,
        notes,
        starts_at,
        ends_at,
        cancelled_at,
        cancelled_reason,
        status_history,
        record,
        created_at,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        $35::jsonb, $36::jsonb, $37, $38
      )
      on conflict (id) do update
      set
        actor_user_id = excluded.actor_user_id,
        management_token = excluded.management_token,
        booking_code = excluded.booking_code,
        status = excluded.status,
        source_assessment_id = excluded.source_assessment_id,
        source_treatment_plan_id = excluded.source_treatment_plan_id,
        service_slug = excluded.service_slug,
        service_variant_slug = excluded.service_variant_slug,
        service_name = excluded.service_name,
        customer_email = excluded.customer_email,
        customer_first_name = excluded.customer_first_name,
        customer_last_name = excluded.customer_last_name,
        customer_phone = excluded.customer_phone,
        provider_slug = excluded.provider_slug,
        provider_name = excluded.provider_name,
        machine_slug = excluded.machine_slug,
        machine_name = excluded.machine_name,
        room_slug = excluded.room_slug,
        room_name = excluded.room_name,
        currency_code = excluded.currency_code,
        retail_amount_cents = excluded.retail_amount_cents,
        member_amount_cents = excluded.member_amount_cents,
        final_amount_cents = excluded.final_amount_cents,
        membership_required = excluded.membership_required,
        applied_pricing_mode = excluded.applied_pricing_mode,
        notes = excluded.notes,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        cancelled_at = excluded.cancelled_at,
        cancelled_reason = excluded.cancelled_reason,
        status_history = excluded.status_history,
        record = excluded.record,
        updated_at = excluded.updated_at
    `,
    [
      booking.id,
      scope.brand_id,
      scope.location_id,
      booking.locationSlug,
      booking.actorUserId ?? null,
      managementToken,
      booking.code,
      booking.status,
      booking.sourceAssessmentId ?? null,
      booking.sourceTreatmentPlanId ?? null,
      booking.serviceSlug,
      booking.serviceVariantSlug,
      booking.serviceName,
      booking.customer.email,
      booking.customer.firstName,
      booking.customer.lastName,
      booking.customer.phone ?? null,
      booking.providerSlug,
      booking.providerName,
      booking.machineSlug,
      booking.machineName,
      booking.roomSlug ?? null,
      booking.roomName ?? null,
      booking.charge.currency,
      booking.charge.retailAmountCents,
      booking.charge.memberAmountCents ?? null,
      booking.charge.finalAmountCents,
      booking.charge.membershipRequired,
      booking.charge.appliedPricingMode,
      booking.notes ?? null,
      booking.startAt,
      booking.endAt,
      booking.cancelledAt ?? null,
      booking.cancelledReason ?? null,
      JSON.stringify(booking.statusHistory),
      JSON.stringify(booking),
      booking.createdAt,
      booking.updatedAt,
    ],
  );
};

export const createPostgresBookingRepository = (db: Queryable) => ({
  save: async (booking: BookingRecord, managementToken: string) => {
    await upsertBooking(db, booking, managementToken);
  },
  update: async (booking: BookingRecord) => {
    const existing = await db.query<{ management_token: string }>(
      `
        select management_token
        from commerce_booking_projection
        where id = $1
        limit 1
      `,
      [booking.id],
    );

    if (existing.rowCount === 0) {
      throw new Error("Booking not found in Postgres booking persistence.");
    }

    await upsertBooking(db, booking, existing.rows[0].management_token);
  },
  getStored: async (bookingId: string): Promise<StoredBookingRecord | undefined> => {
    const result = await db.query<{ management_token: string; record: BookingRecord }>(
      `
        select management_token, record
        from commerce_booking_projection
        where id = $1
        limit 1
      `,
      [bookingId],
    );

    if (result.rowCount === 0) {
      return undefined;
    }

    return {
      managementToken: result.rows[0].management_token,
      booking: parseBookingRecord(result.rows[0].record),
    };
  },
  listAll: async (): Promise<BookingRecord[]> => {
    const result = await db.query<{ record: BookingRecord }>(
      `
        select record
        from commerce_booking_projection
        order by updated_at desc
      `,
    );

    return result.rows.map((row) => parseBookingRecord(row.record));
  },
  listByStatus: async (status: BookingStatus): Promise<BookingRecord[]> => {
    const result = await db.query<{ record: BookingRecord }>(
      `
        select record
        from commerce_booking_projection
        where status = $1
        order by updated_at desc
      `,
      [status],
    );

    return result.rows.map((row) => parseBookingRecord(row.record));
  },
  listReservationWindows: async (): Promise<ReservationWindowRecord[]> => {
    const result = await db.query<{
      id: string;
      provider_slug: string;
      machine_slug: string;
      room_slug: string | null;
      starts_at: string;
      ends_at: string;
    }>(
      `
        select id, provider_slug, machine_slug, room_slug, starts_at, ends_at
        from commerce_booking_projection
        where status = 'confirmed'
        order by starts_at asc
      `,
    );

    return result.rows.map((row) => ({
      bookingId: row.id,
      providerSlug: row.provider_slug,
      machineSlug: row.machine_slug,
      roomSlug: row.room_slug ?? undefined,
      startAt: row.starts_at,
      endAt: row.ends_at,
    }));
  },
});
