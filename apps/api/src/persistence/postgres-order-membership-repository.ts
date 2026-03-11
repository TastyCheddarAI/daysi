import type { Pool } from "pg";

import type {
  MembershipSubscription,
  MembershipUsageRecord,
  OrderRecord,
} from "../../../../packages/domain/src";

import type { StoredOrderRecord } from "./commerce-repository";

type Queryable = Pick<Pool, "query">;

interface LocationScopeRow {
  brand_id: string;
  location_id: string;
}

interface SubscriptionScopeRow extends LocationScopeRow {
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

const resolveSubscriptionScope = async (
  db: Queryable,
  subscriptionId: string,
): Promise<SubscriptionScopeRow> => {
  const result = await db.query<SubscriptionScopeRow>(
    `
      select brand_id, location_id, location_slug
      from commerce_membership_subscription_projection
      where id = $1
      limit 1
    `,
    [subscriptionId],
  );

  if (result.rowCount === 0) {
    throw new Error(
      `Membership subscription ${subscriptionId} is not available in Postgres persistence.`,
    );
  }

  return result.rows[0];
};

const parseOrderRecord = (value: unknown): OrderRecord => value as OrderRecord;
const parseMembershipSubscription = (value: unknown): MembershipSubscription =>
  value as MembershipSubscription;
const parseMembershipUsageRecord = (value: unknown): MembershipUsageRecord =>
  value as MembershipUsageRecord;

const upsertOrder = async (
  db: Queryable,
  order: OrderRecord,
  managementToken: string,
): Promise<void> => {
  const scope = await resolveLocationScope(db, order.locationSlug);

  await db.query(
    `
      insert into commerce_order_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        actor_user_id,
        management_token,
        order_code,
        status,
        payment_status,
        customer_email,
        customer_first_name,
        customer_last_name,
        customer_phone,
        currency_code,
        subtotal_cents,
        discount_cents,
        total_cents,
        line_items,
        applied_coupons,
        applied_account_credit_amount,
        revenue_breakdown,
        payment_intent_id,
        provisioning,
        created_at,
        updated_at,
        paid_at,
        refunded_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, $22, $23::jsonb, $24, $25, $26, $27,
        $28::jsonb
      )
      on conflict (id) do update
      set
        actor_user_id = excluded.actor_user_id,
        management_token = excluded.management_token,
        order_code = excluded.order_code,
        status = excluded.status,
        payment_status = excluded.payment_status,
        customer_email = excluded.customer_email,
        customer_first_name = excluded.customer_first_name,
        customer_last_name = excluded.customer_last_name,
        customer_phone = excluded.customer_phone,
        currency_code = excluded.currency_code,
        subtotal_cents = excluded.subtotal_cents,
        discount_cents = excluded.discount_cents,
        total_cents = excluded.total_cents,
        line_items = excluded.line_items,
        applied_coupons = excluded.applied_coupons,
        applied_account_credit_amount = excluded.applied_account_credit_amount,
        revenue_breakdown = excluded.revenue_breakdown,
        payment_intent_id = excluded.payment_intent_id,
        provisioning = excluded.provisioning,
        updated_at = excluded.updated_at,
        paid_at = excluded.paid_at,
        refunded_at = excluded.refunded_at,
        record = excluded.record
    `,
    [
      order.id,
      scope.brand_id,
      scope.location_id,
      order.locationSlug,
      order.actorUserId ?? null,
      managementToken,
      order.code,
      order.status,
      order.paymentStatus,
      order.customer.email,
      order.customer.firstName,
      order.customer.lastName,
      order.customer.phone ?? null,
      order.currency,
      order.subtotalAmount.amountCents,
      order.discountAmount.amountCents,
      order.totalAmount.amountCents,
      JSON.stringify(order.lineItems),
      JSON.stringify(order.appliedCoupons),
      JSON.stringify(order.appliedAccountCreditAmount),
      JSON.stringify(order.revenueBreakdown),
      order.paymentIntentId ?? null,
      JSON.stringify(order.provisioning),
      order.createdAt,
      order.updatedAt,
      order.paidAt ?? null,
      order.refundedAt ?? null,
      JSON.stringify(order),
    ],
  );
};

const upsertSubscription = async (
  db: Queryable,
  subscription: MembershipSubscription,
): Promise<void> => {
  const scope = await resolveLocationScope(db, subscription.locationSlug);

  await db.query(
    `
      insert into commerce_membership_subscription_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        actor_user_id,
        plan_slug,
        status,
        customer_email,
        customer_name,
        source_order_id,
        created_at,
        activated_at,
        cancelled_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
      )
      on conflict (id) do update
      set
        actor_user_id = excluded.actor_user_id,
        plan_slug = excluded.plan_slug,
        status = excluded.status,
        customer_email = excluded.customer_email,
        customer_name = excluded.customer_name,
        source_order_id = excluded.source_order_id,
        activated_at = excluded.activated_at,
        cancelled_at = excluded.cancelled_at,
        record = excluded.record
    `,
    [
      subscription.id,
      scope.brand_id,
      scope.location_id,
      subscription.locationSlug,
      subscription.actorUserId ?? null,
      subscription.planSlug,
      subscription.status,
      subscription.customerEmail,
      subscription.customerName,
      subscription.sourceOrderId ?? null,
      subscription.createdAt,
      subscription.activatedAt ?? null,
      subscription.cancelledAt ?? null,
      JSON.stringify(subscription),
    ],
  );
};

const upsertUsage = async (
  db: Queryable,
  usage: MembershipUsageRecord,
): Promise<void> => {
  const scope = await resolveSubscriptionScope(db, usage.subscriptionId);

  await db.query(
    `
      insert into commerce_membership_usage_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        subscription_id,
        plan_slug,
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
        plan_slug = excluded.plan_slug,
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
      usage.subscriptionId,
      usage.planSlug,
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

export const createPostgresOrderRepository = (db: Queryable) => ({
  save: async (order: OrderRecord, managementToken: string) => {
    await upsertOrder(db, order, managementToken);
  },
  update: async (order: OrderRecord) => {
    const existing = await db.query<{ management_token: string }>(
      `
        select management_token
        from commerce_order_projection
        where id = $1
        limit 1
      `,
      [order.id],
    );

    if (existing.rowCount === 0) {
      throw new Error("Order not found in Postgres commerce persistence.");
    }

    await upsertOrder(db, order, existing.rows[0].management_token);
  },
  getStored: async (orderId: string): Promise<StoredOrderRecord | undefined> => {
    const result = await db.query<{ management_token: string; record: OrderRecord }>(
      `
        select management_token, record
        from commerce_order_projection
        where id = $1
        limit 1
      `,
      [orderId],
    );

    if (result.rowCount === 0) {
      return undefined;
    }

    return {
      managementToken: result.rows[0].management_token,
      order: parseOrderRecord(result.rows[0].record),
    };
  },
  listAll: async (): Promise<OrderRecord[]> => {
    const result = await db.query<{ record: OrderRecord }>(
      `
        select record
        from commerce_order_projection
        order by updated_at desc
      `,
    );

    return result.rows.map((row) => parseOrderRecord(row.record));
  },
  listForActor: async (input: {
    actorUserId?: string;
    actorEmail?: string;
  }): Promise<OrderRecord[]> => {
    const actorEmail = input.actorEmail?.toLowerCase() ?? null;
    const result = await db.query<{ record: OrderRecord }>(
      `
        select record
        from commerce_order_projection
        where ($1::text is not null and actor_user_id = $1)
           or ($2::text is not null and lower(customer_email) = $2)
        order by updated_at desc
      `,
      [input.actorUserId ?? null, actorEmail],
    );

    return result.rows.map((row) => parseOrderRecord(row.record));
  },
  findByPaymentIntent: async (
    paymentIntentId: string,
  ): Promise<StoredOrderRecord | undefined> => {
    const result = await db.query<{ management_token: string; record: OrderRecord }>(
      `
        select management_token, record
        from commerce_order_projection
        where payment_intent_id = $1
        limit 1
      `,
      [paymentIntentId],
    );

    if (result.rowCount === 0) {
      return undefined;
    }

    return {
      managementToken: result.rows[0].management_token,
      order: parseOrderRecord(result.rows[0].record),
    };
  },
});

export const createPostgresMembershipRepository = (db: Queryable) => ({
  saveSubscription: async (subscription: MembershipSubscription) => {
    await upsertSubscription(db, subscription);
  },
  updateSubscription: async (subscription: MembershipSubscription) => {
    await upsertSubscription(db, subscription);
  },
  getSubscription: async (
    subscriptionId: string,
  ): Promise<MembershipSubscription | undefined> => {
    const result = await db.query<{ record: MembershipSubscription }>(
      `
        select record
        from commerce_membership_subscription_projection
        where id = $1
        limit 1
      `,
      [subscriptionId],
    );

    return result.rows[0]
      ? parseMembershipSubscription(result.rows[0].record)
      : undefined;
  },
  listSubscriptionsForActor: async (input: {
    actorUserId?: string;
    actorEmail?: string;
  }): Promise<MembershipSubscription[]> => {
    const actorEmail = input.actorEmail?.toLowerCase() ?? null;
    const result = await db.query<{ record: MembershipSubscription }>(
      `
        select record
        from commerce_membership_subscription_projection
        where ($1::text is not null and actor_user_id = $1)
           or ($2::text is not null and lower(customer_email) = $2)
        order by created_at desc
      `,
      [input.actorUserId ?? null, actorEmail],
    );

    return result.rows.map((row) => parseMembershipSubscription(row.record));
  },
  listAllSubscriptions: async (): Promise<MembershipSubscription[]> => {
    const result = await db.query<{ record: MembershipSubscription }>(
      `
        select record
        from commerce_membership_subscription_projection
        order by created_at desc
      `,
    );

    return result.rows.map((row) => parseMembershipSubscription(row.record));
  },
  saveUsageRecord: async (
    usage: MembershipUsageRecord,
  ): Promise<MembershipUsageRecord> => {
    await upsertUsage(db, usage);
    return usage;
  },
  listAllUsageRecords: async (): Promise<MembershipUsageRecord[]> => {
    const result = await db.query<{ record: MembershipUsageRecord }>(
      `
        select record
        from commerce_membership_usage_projection
        order by created_at desc
      `,
    );

    return result.rows.map((row) => parseMembershipUsageRecord(row.record));
  },
  hasUsageRecord: async (input: {
    sourceOrderId: string;
    subscriptionId: string;
    serviceSlug: string;
    bookingId?: string;
  }): Promise<boolean> => {
    const result = await db.query<{ exists: boolean }>(
      `
        select true as exists
        from commerce_membership_usage_projection
        where source_order_id = $1
          and subscription_id = $2
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
        input.subscriptionId,
        input.serviceSlug,
        input.bookingId ?? null,
      ],
    );

    return (result.rowCount ?? 0) > 0;
  },
  reverseUsageBySourceOrder: async (
    sourceOrderId: string,
    reverse: (usage: MembershipUsageRecord) => MembershipUsageRecord,
  ): Promise<void> => {
    const result = await db.query<{ record: MembershipUsageRecord }>(
      `
        select record
        from commerce_membership_usage_projection
        where source_order_id = $1
          and status = 'consumed'
      `,
      [sourceOrderId],
    );

    for (const row of result.rows) {
      await upsertUsage(db, reverse(parseMembershipUsageRecord(row.record)));
    }
  },
});
