import type { Pool } from "pg";

import type {
  CreditEntry,
  ServicePackagePurchase,
  ServicePackageUsageRecord,
} from "../../../../packages/domain/src";

type Queryable = Pick<Pool, "query">;

interface LocationScopeRow {
  brand_id: string;
  location_id: string;
}

interface PackageScopeRow extends LocationScopeRow {
  location_slug: string;
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
    throw new Error(`Location ${locationSlug} is not available in Postgres commerce persistence.`);
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const resolvePackageScope = async (
  db: Queryable,
  packagePurchaseId: string,
): Promise<PackageScopeRow> => {
  const result = await db.query<PackageScopeRow>(
    `
      select brand_id, location_id, location_slug
      from commerce_service_package_purchase_projection
      where id = $1
      limit 1
    `,
    [packagePurchaseId],
  );

  if (result.rowCount === 0) {
    throw new Error(
      `Service package purchase ${packagePurchaseId} is not available in Postgres persistence.`,
    );
  }

  return result.rows[0];
};

const parseServicePackagePurchase = (value: unknown): ServicePackagePurchase =>
  value as ServicePackagePurchase;
const parseServicePackageUsageRecord = (value: unknown): ServicePackageUsageRecord =>
  value as ServicePackageUsageRecord;
const parseCreditEntry = (value: unknown): CreditEntry => value as CreditEntry;

const upsertServicePackagePurchase = async (
  db: Queryable,
  purchase: ServicePackagePurchase,
): Promise<void> => {
  const scope = await resolveLocationScope(db, purchase.locationSlug);

  await db.query(
    `
      insert into commerce_service_package_purchase_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        actor_user_id,
        package_slug,
        status,
        customer_email,
        customer_name,
        source_order_id,
        created_at,
        activated_at,
        revoked_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
      )
      on conflict (id) do update
      set
        actor_user_id = excluded.actor_user_id,
        package_slug = excluded.package_slug,
        status = excluded.status,
        customer_email = excluded.customer_email,
        customer_name = excluded.customer_name,
        source_order_id = excluded.source_order_id,
        activated_at = excluded.activated_at,
        revoked_at = excluded.revoked_at,
        record = excluded.record
    `,
    [
      purchase.id,
      scope.brand_id,
      scope.location_id,
      purchase.locationSlug,
      purchase.actorUserId ?? null,
      purchase.packageSlug,
      purchase.status,
      purchase.customerEmail,
      purchase.customerName,
      purchase.sourceOrderId ?? null,
      purchase.createdAt,
      purchase.activatedAt ?? null,
      purchase.revokedAt ?? null,
      JSON.stringify(purchase),
    ],
  );
};

const upsertServicePackageUsage = async (
  db: Queryable,
  usage: ServicePackageUsageRecord,
): Promise<void> => {
  const scope = await resolvePackageScope(db, usage.packagePurchaseId);

  await db.query(
    `
      insert into commerce_service_package_usage_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        package_purchase_id,
        package_slug,
        service_slug,
        booking_id,
        quantity,
        source_order_id,
        status,
        created_at,
        reversed_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
      )
      on conflict (id) do update
      set
        package_slug = excluded.package_slug,
        service_slug = excluded.service_slug,
        booking_id = excluded.booking_id,
        quantity = excluded.quantity,
        source_order_id = excluded.source_order_id,
        status = excluded.status,
        reversed_at = excluded.reversed_at,
        record = excluded.record
    `,
    [
      usage.id,
      scope.brand_id,
      scope.location_id,
      scope.location_slug,
      usage.packagePurchaseId,
      usage.packageSlug,
      usage.serviceSlug,
      usage.bookingId ?? null,
      usage.quantity,
      usage.sourceOrderId ?? null,
      usage.status,
      usage.createdAt,
      usage.reversedAt ?? null,
      JSON.stringify(usage),
    ],
  );
};

export const createPostgresServicePackageRepository = (db: Queryable) => ({
  savePurchase: async (purchase: ServicePackagePurchase) => {
    await upsertServicePackagePurchase(db, purchase);
  },
  updatePurchase: async (purchase: ServicePackagePurchase) => {
    await upsertServicePackagePurchase(db, purchase);
  },
  getPurchase: async (
    purchaseId: string,
  ): Promise<ServicePackagePurchase | undefined> => {
    const result = await db.query<{ record: ServicePackagePurchase }>(
      `
        select record
        from commerce_service_package_purchase_projection
        where id = $1
        limit 1
      `,
      [purchaseId],
    );

    return result.rows[0]
      ? parseServicePackagePurchase(result.rows[0].record)
      : undefined;
  },
  listAllPurchases: async (): Promise<ServicePackagePurchase[]> => {
    const result = await db.query<{ record: ServicePackagePurchase }>(
      `
        select record
        from commerce_service_package_purchase_projection
        order by created_at desc
      `,
    );

    return result.rows.map((row) => parseServicePackagePurchase(row.record));
  },
  listPurchasesForActor: async (input: {
    actorUserId?: string;
    actorEmail?: string;
  }): Promise<ServicePackagePurchase[]> => {
    const actorEmail = input.actorEmail?.toLowerCase() ?? null;
    const result = await db.query<{ record: ServicePackagePurchase }>(
      `
        select record
        from commerce_service_package_purchase_projection
        where ($1::text is not null and actor_user_id = $1)
           or ($2::text is not null and lower(customer_email) = $2)
        order by created_at desc
      `,
      [input.actorUserId ?? null, actorEmail],
    );

    return result.rows.map((row) => parseServicePackagePurchase(row.record));
  },
  saveUsageRecord: async (
    usage: ServicePackageUsageRecord,
  ): Promise<ServicePackageUsageRecord> => {
    await upsertServicePackageUsage(db, usage);
    return usage;
  },
  listAllUsageRecords: async (): Promise<ServicePackageUsageRecord[]> => {
    const result = await db.query<{ record: ServicePackageUsageRecord }>(
      `
        select record
        from commerce_service_package_usage_projection
        order by created_at desc
      `,
    );

    return result.rows.map((row) => parseServicePackageUsageRecord(row.record));
  },
  hasUsageRecord: async (input: {
    sourceOrderId: string;
    packagePurchaseId: string;
    serviceSlug: string;
    bookingId?: string;
  }): Promise<boolean> => {
    const result = await db.query<{ exists: boolean }>(
      `
        select true as exists
        from commerce_service_package_usage_projection
        where source_order_id = $1
          and package_purchase_id = $2
          and service_slug = $3
          and status = 'consumed'
          and (
            ($4::text is null and booking_id is null)
            or booking_id = $4
          )
        limit 1
      `,
      [
        input.sourceOrderId,
        input.packagePurchaseId,
        input.serviceSlug,
        input.bookingId ?? null,
      ],
    );

    return (result.rowCount ?? 0) > 0;
  },
  reverseUsageBySourceOrder: async (
    sourceOrderId: string,
    reverse: (usage: ServicePackageUsageRecord) => ServicePackageUsageRecord,
  ): Promise<void> => {
    const result = await db.query<{ record: ServicePackageUsageRecord }>(
      `
        select record
        from commerce_service_package_usage_projection
        where source_order_id = $1
          and status = 'consumed'
      `,
      [sourceOrderId],
    );

    for (const row of result.rows) {
      await upsertServicePackageUsage(db, reverse(parseServicePackageUsageRecord(row.record)));
    }
  },
});

export const createPostgresCreditRepository = (db: Queryable) => ({
  saveEntry: async (entry: CreditEntry): Promise<CreditEntry> => {
    const scope = await resolveLocationScope(db, entry.locationSlug);

    await db.query(
      `
        insert into commerce_credit_entry_projection (
          id,
          brand_id,
          location_id,
          location_slug,
          actor_user_id,
          type,
          currency_code,
          amount_cents,
          customer_email,
          source_order_id,
          note,
          granted_by_user_id,
          created_at,
          record
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
        )
        on conflict (id) do update
        set
          actor_user_id = excluded.actor_user_id,
          type = excluded.type,
          currency_code = excluded.currency_code,
          amount_cents = excluded.amount_cents,
          customer_email = excluded.customer_email,
          source_order_id = excluded.source_order_id,
          note = excluded.note,
          granted_by_user_id = excluded.granted_by_user_id,
          record = excluded.record
      `,
      [
        entry.id,
        scope.brand_id,
        scope.location_id,
        entry.locationSlug,
        entry.actorUserId ?? null,
        entry.type,
        entry.amount.currency,
        entry.amount.amountCents,
        entry.customerEmail,
        entry.sourceOrderId ?? null,
        entry.note ?? null,
        entry.grantedByUserId ?? null,
        entry.createdAt,
        JSON.stringify(entry),
      ],
    );

    return entry;
  },
  listAll: async (): Promise<CreditEntry[]> => {
    const result = await db.query<{ record: CreditEntry }>(
      `
        select record
        from commerce_credit_entry_projection
        order by created_at desc
      `,
    );

    return result.rows.map((row) => parseCreditEntry(row.record));
  },
  listForActor: async (input: {
    actorUserId?: string;
    actorEmail?: string;
  }): Promise<CreditEntry[]> => {
    const actorEmail = input.actorEmail?.toLowerCase() ?? null;
    const result = await db.query<{ record: CreditEntry }>(
      `
        select record
        from commerce_credit_entry_projection
        where ($1::text is not null and actor_user_id = $1)
           or ($2::text is not null and lower(customer_email) = $2)
        order by created_at desc
      `,
      [input.actorUserId ?? null, actorEmail],
    );

    return result.rows.map((row) => parseCreditEntry(row.record));
  },
  hasEntryForOrderAndType: async (
    sourceOrderId: string,
    type: CreditEntry["type"],
  ): Promise<boolean> => {
    const result = await db.query<{ exists: boolean }>(
      `
        select true as exists
        from commerce_credit_entry_projection
        where source_order_id = $1
          and type = $2
        limit 1
      `,
      [sourceOrderId, type],
    );

    return (result.rowCount ?? 0) > 0;
  },
});
