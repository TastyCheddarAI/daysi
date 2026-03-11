import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import type {
  CatalogService,
  CouponDefinition,
  LocationFeature,
  LocationOperatingSchedule,
  MachineResource,
  MembershipPlan,
  ProviderCompPlan,
  ProviderResource,
  RecurringTimeWindow,
  RoomResource,
  TenantLocation,
  TenantOrganization,
} from "../../../../packages/domain/src";

import type { AppEnv } from "../config";
import { initializeClinicDefinitionRepository } from "./clinic-definition-repository";
import { getPostgresPool } from "./postgres-pool";

const LOCATION_FEATURES: LocationFeature[] = [
  "education",
  "memberships",
  "referrals",
  "skinAnalysis",
];

type ScheduleRowInput = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

const toTitle = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const flattenScheduleRows = (
  windows: RecurringTimeWindow[],
): ScheduleRowInput[] =>
  windows.flatMap((window) =>
    window.daysOfWeek.map((dayOfWeek) => ({
      dayOfWeek,
      startMinute: window.startMinute,
      endMinute: window.endMinute,
    })),
  );

const withTransaction = async <T>(
  env: AppEnv,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const pool = getPostgresPool(env);
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

const resolveBrandId = async (client: PoolClient, env: AppEnv): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      select id::text
      from brand
      where slug = $1
      limit 1
    `,
    [env.DAYSI_BRAND_SLUG],
  );

  if (result.rowCount === 0) {
    throw new Error(`Brand ${env.DAYSI_BRAND_SLUG} is not available.`);
  }

  return result.rows[0].id;
};

const resolveOrganizationId = async (
  client: PoolClient,
  brandId: string,
  organizationId: string,
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      select id::text
      from organization
      where brand_id = $1::uuid
        and id = $2::uuid
      limit 1
    `,
    [brandId, organizationId],
  );

  if (result.rowCount === 0) {
    throw new Error(`Organization ${organizationId} is not available.`);
  }

  return result.rows[0].id;
};

const resolveLocation = async (
  client: PoolClient,
  brandId: string,
  locationSlug: string,
): Promise<{ id: string; organizationId: string }> => {
  const result = await client.query<{ id: string; organization_id: string }>(
    `
      select id::text, organization_id::text
      from location
      where brand_id = $1::uuid
        and slug = $2
      limit 1
    `,
    [brandId, locationSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Location ${locationSlug} is not available.`);
  }

  return {
    id: result.rows[0].id,
    organizationId: result.rows[0].organization_id,
  };
};

const resolveService = async (
  client: PoolClient,
  brandId: string,
  serviceSlug: string,
): Promise<{ id: string; variantId: string }> => {
  const result = await client.query<{ id: string; variant_id: string }>(
    `
      select s.id::text, sv.id::text as variant_id
      from service as s
      join service_variant as sv
        on sv.service_id = s.id
      where s.brand_id = $1::uuid
        and s.slug = $2
      order by sv.created_at desc
      limit 1
    `,
    [brandId, serviceSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Service ${serviceSlug} is not available.`);
  }

  return {
    id: result.rows[0].id,
    variantId: result.rows[0].variant_id,
  };
};

const resolveEducationOfferId = async (
  client: PoolClient,
  brandId: string,
  offerSlug: string,
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      select id::text
      from education_offer
      where brand_id = $1::uuid
        and slug = $2
      limit 1
    `,
    [brandId, offerSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Education offer ${offerSlug} is not available.`);
  }

  return result.rows[0].id;
};

const resolveProvider = async (
  client: PoolClient,
  brandId: string,
  providerSlug: string,
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      select id::text
      from provider
      where brand_id = $1::uuid
        and slug = $2
      limit 1
    `,
    [brandId, providerSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Provider ${providerSlug} is not available.`);
  }

  return result.rows[0].id;
};

const upsertAppUser = async (
  client: PoolClient,
  email: string,
  displayName: string,
): Promise<string> => {
  const existing = await client.query<{ id: string }>(
    `
      select id::text
      from app_user
      where lower(email) = lower($1)
      limit 1
    `,
    [email],
  );

  if ((existing.rowCount ?? 0) > 0) {
    await client.query(
      `
        update app_user
        set
          email = $2,
          display_name = $3,
          status = 'active'
        where id = $1::uuid
      `,
      [existing.rows[0].id, email, displayName],
    );

    return existing.rows[0].id;
  }

  const created = await client.query<{ id: string }>(
    `
      insert into app_user (
        email,
        display_name,
        status
      )
      values ($1, $2, 'active')
      returning id::text
    `,
    [email, displayName],
  );

  return created.rows[0].id;
};

const resolveMachineInventory = async (
  client: PoolClient,
  brandId: string,
  locationSlug: string,
  machineSlug: string,
): Promise<{ inventoryId: string; machineId: string }> => {
  const result = await client.query<{ inventory_id: string; machine_id: string }>(
    `
      select
        lmi.id::text as inventory_id,
        m.id::text as machine_id
      from location_machine_inventory as lmi
      join machine as m on m.id = lmi.machine_id
      join location as l on l.id = lmi.location_id
      where l.brand_id = $1::uuid
        and l.slug = $2
        and m.slug = $3
      limit 1
    `,
    [brandId, locationSlug, machineSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Machine ${machineSlug} is not available at location ${locationSlug}.`);
  }

  return {
    inventoryId: result.rows[0].inventory_id,
    machineId: result.rows[0].machine_id,
  };
};

const resolveRoomId = async (
  client: PoolClient,
  brandId: string,
  locationSlug: string,
  roomSlug: string,
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      select r.id::text
      from room as r
      join location as l on l.id = r.location_id
      where l.brand_id = $1::uuid
        and l.slug = $2
        and r.slug = $3
      limit 1
    `,
    [brandId, locationSlug, roomSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Room ${roomSlug} is not available at location ${locationSlug}.`);
  }

  return result.rows[0].id;
};

const replaceLocationFeatureFlags = async (
  client: PoolClient,
  locationId: string,
  enabledModules: LocationFeature[],
): Promise<void> => {
  await client.query(
    `
      delete from location_feature_flag
      where location_id = $1::uuid
    `,
    [locationId],
  );

  for (const feature of LOCATION_FEATURES) {
    await client.query(
      `
        insert into location_feature_flag (
          id,
          location_id,
          feature_key,
          enabled
        )
        values ($1::uuid, $2::uuid, $3, $4)
      `,
      [randomUUID(), locationId, feature, enabledModules.includes(feature)],
    );
  }
};

const replaceOpenScheduleRows = async (
  client: PoolClient,
  tableName:
    | "location_schedule"
    | "machine_schedule"
    | "room_schedule"
    | "provider_schedule_template",
  scopeColumn:
    | "location_id"
    | "location_machine_inventory_id"
    | "room_id"
    | "provider_id",
  scopeId: string,
  rows: ScheduleRowInput[],
  extraColumns: Record<string, string> = {},
): Promise<void> => {
  await client.query(
    `
      delete from ${tableName}
      where ${scopeColumn} = $1::uuid
      ${
        tableName === "location_schedule" ||
        tableName === "machine_schedule" ||
        tableName === "room_schedule"
          ? "and schedule_kind = 'open'"
          : ""
      }
    `,
    [scopeId],
  );

  for (const row of rows) {
    const id = randomUUID();

    if (tableName === "provider_schedule_template") {
      await client.query(
        `
          insert into provider_schedule_template (
            id,
            provider_id,
            location_id,
            day_of_week,
            start_minute,
            end_minute
          )
          values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
        `,
        [
          id,
          scopeId,
          extraColumns.locationId,
          row.dayOfWeek,
          row.startMinute,
          row.endMinute,
        ],
      );
      continue;
    }

    await client.query(
      `
        insert into ${tableName} (
          id,
          ${scopeColumn},
          day_of_week,
          start_minute,
          end_minute,
          schedule_kind
        )
        values ($1::uuid, $2::uuid, $3, $4, $5, 'open')
      `,
      [id, scopeId, row.dayOfWeek, row.startMinute, row.endMinute],
    );
  }
};

const replaceProviderExceptions = async (
  client: PoolClient,
  providerId: string,
  locationId: string,
  windows: Array<{ startAt: string; endAt: string }>,
): Promise<void> => {
  await client.query(
    `
      delete from provider_schedule_exception
      where provider_id = $1::uuid
        and location_id = $2::uuid
    `,
    [providerId, locationId],
  );

  for (const window of windows) {
    await client.query(
      `
        insert into provider_schedule_exception (
          id,
          provider_id,
          location_id,
          starts_at,
          ends_at,
          exception_kind
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $5::timestamptz, 'manual_override')
      `,
      [randomUUID(), providerId, locationId, window.startAt, window.endAt],
    );
  }
};

const replaceMachineBlockedWindows = async (
  client: PoolClient,
  inventoryId: string,
  windows: Array<{ startAt: string; endAt: string }>,
): Promise<void> => {
  await client.query(
    `
      delete from machine_booking_window
      where location_machine_inventory_id = $1::uuid
        and booking_id is null
    `,
    [inventoryId],
  );

  for (const window of windows) {
    await client.query(
      `
        insert into machine_booking_window (
          id,
          location_machine_inventory_id,
          window_kind,
          starts_at,
          ends_at
        )
        values ($1::uuid, $2::uuid, 'admin_hold', $3::timestamptz, $4::timestamptz)
      `,
      [randomUUID(), inventoryId, window.startAt, window.endAt],
    );
  }
};

const replaceRoomBlockedWindows = async (
  client: PoolClient,
  roomId: string,
  windows: Array<{ startAt: string; endAt: string }>,
): Promise<void> => {
  await client.query(
    `
      delete from room_booking_window
      where room_id = $1::uuid
        and booking_id is null
    `,
    [roomId],
  );

  for (const window of windows) {
    await client.query(
      `
        insert into room_booking_window (
          id,
          room_id,
          window_kind,
          starts_at,
          ends_at
        )
        values ($1::uuid, $2::uuid, 'admin_hold', $3::timestamptz, $4::timestamptz)
      `,
      [randomUUID(), roomId, window.startAt, window.endAt],
    );
  }
};

const replaceMachineCapabilities = async (
  client: PoolClient,
  machineId: string,
  capabilities: string[],
): Promise<void> => {
  await client.query(
    `
      delete from machine_capability
      where machine_id = $1::uuid
    `,
    [machineId],
  );

  for (const capability of capabilities) {
    await client.query(
      `
        insert into machine_capability (
          id,
          machine_id,
          capability_key
        )
        values ($1::uuid, $2::uuid, $3)
      `,
      [randomUUID(), machineId, capability],
    );
  }
};

const replaceRoomCapabilities = async (
  client: PoolClient,
  roomId: string,
  capabilities: string[],
): Promise<void> => {
  await client.query(
    `
      delete from room_capability
      where room_id = $1::uuid
    `,
    [roomId],
  );

  for (const capability of capabilities) {
    await client.query(
      `
        insert into room_capability (
          id,
          room_id,
          capability_key
        )
        values ($1::uuid, $2::uuid, $3)
      `,
      [randomUUID(), roomId, capability],
    );
  }
};

const upsertServiceCategory = async (
  client: PoolClient,
  brandId: string,
  categorySlug: string,
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      insert into service_category (
        brand_id,
        slug,
        display_name
      )
      values ($1::uuid, $2, $3)
      on conflict (brand_id, slug) do update
      set display_name = excluded.display_name
      returning id::text
    `,
    [brandId, categorySlug, toTitle(categorySlug)],
  );

  return result.rows[0].id;
};

const upsertServiceRecord = async (
  client: PoolClient,
  brandId: string,
  service: CatalogService,
): Promise<{ serviceId: string; variantId: string }> => {
  const categoryId = await upsertServiceCategory(client, brandId, service.categorySlug);
  const serviceResult = await client.query<{ id: string }>(
    `
      insert into service (
        brand_id,
        service_category_id,
        slug,
        display_name,
        short_description,
        description,
        revenue_stream
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, 'services')
      on conflict (brand_id, slug) do update
      set
        service_category_id = excluded.service_category_id,
        display_name = excluded.display_name,
        short_description = excluded.short_description,
        description = excluded.description
      returning id::text
    `,
    [
      brandId,
      categoryId,
      service.slug,
      service.name,
      service.shortDescription,
      service.description,
    ],
  );
  const serviceId = serviceResult.rows[0].id;
  const variantResult = await client.query<{ id: string }>(
    `
      insert into service_variant (
        service_id,
        slug,
        display_name,
        duration_minutes
      )
      values ($1::uuid, $2, $3, $4)
      on conflict (service_id, slug) do update
      set
        display_name = excluded.display_name,
        duration_minutes = excluded.duration_minutes
      returning id::text
    `,
    [serviceId, service.variantSlug, service.name, service.durationMinutes],
  );

  return {
    serviceId,
    variantId: variantResult.rows[0].id,
  };
};

const replaceServiceResourceRules = async (
  client: PoolClient,
  variantId: string,
  service: CatalogService,
): Promise<void> => {
  await client.query(
    `
      delete from machine_service_rule
      where service_variant_id = $1::uuid
    `,
    [variantId],
  );

  for (const capability of service.machineCapabilities) {
    await client.query(
      `
        insert into machine_service_rule (
          id,
          service_variant_id,
          capability_key,
          required_machine_count
        )
        values ($1::uuid, $2::uuid, $3, 1)
      `,
      [randomUUID(), variantId, capability],
    );
  }

  await client.query(
    `
      delete from service_room_rule
      where service_variant_id = $1::uuid
    `,
    [variantId],
  );

  for (const capability of service.roomCapabilities ?? []) {
    await client.query(
      `
        insert into service_room_rule (
          id,
          service_variant_id,
          capability_key
        )
        values ($1::uuid, $2::uuid, $3)
      `,
      [randomUUID(), variantId, capability],
    );
  }
};

const replaceBookingPolicy = async (
  client: PoolClient,
  locationId: string,
  serviceId: string,
  service: CatalogService,
): Promise<void> => {
  await client.query(
    `
      delete from booking_policy
      where location_id = $1::uuid
        and service_id = $2::uuid
    `,
    [locationId, serviceId],
  );

  await client.query(
    `
      insert into booking_policy (
        id,
        location_id,
        service_id,
        cancellation_window_hours,
        buffer_minutes,
        requires_deposit
      )
      values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
    `,
    [
      randomUUID(),
      locationId,
      serviceId,
      service.bookingPolicy.cancellationWindowHours,
      service.bookingPolicy.bufferMinutes,
      service.bookingPolicy.requiresDeposit,
    ],
  );
};

const upsertCourse = async (
  client: PoolClient,
  brandId: string,
  slug: string,
  title: string,
  description: string,
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      insert into course (
        brand_id,
        slug,
        title,
        description
      )
      values ($1::uuid, $2, $3, $4)
      on conflict (brand_id, slug) do update
      set
        title = excluded.title,
        description = excluded.description
      returning id::text
    `,
    [brandId, slug, title, description],
  );

  return result.rows[0].id;
};

const upsertModule = async (
  client: PoolClient,
  courseId: string,
  slug: string,
  position: number,
): Promise<string> => {
  const result = await client.query<{ id: string }>(
    `
      insert into module (
        course_id,
        slug,
        title,
        description,
        position
      )
      values ($1::uuid, $2, $3, '', $4)
      on conflict (course_id, slug) do update
      set
        title = excluded.title,
        position = excluded.position
      returning id::text
    `,
    [courseId, slug, toTitle(slug), position],
  );

  return result.rows[0].id;
};

const refreshDefinitions = async (env: AppEnv): Promise<void> => {
  await initializeClinicDefinitionRepository(env);
};

export const isCanonicalDefinitionWriteEnabled = (env: AppEnv): boolean =>
  env.DAYSI_CLINIC_DEFINITION_REPOSITORY === "postgres";

export const persistCanonicalOrganization = async (
  env: AppEnv,
  organization: TenantOrganization,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);

    await client.query(
      `
        insert into organization (
          brand_id,
          slug,
          name,
          operating_mode
        )
        values ($1::uuid, $2, $3, $4)
        on conflict (brand_id, slug) do update
        set
          name = excluded.name,
          operating_mode = excluded.operating_mode
      `,
      [brandId, organization.slug, organization.name, organization.operatingMode],
    );
  });

  await refreshDefinitions(env);
};

export const persistCanonicalLocation = async (input: {
  env: AppEnv;
  location: TenantLocation;
  operatingSchedule?: LocationOperatingSchedule;
}): Promise<void> => {
  await withTransaction(input.env, async (client) => {
    const brandId = await resolveBrandId(client, input.env);
    const organizationId = await resolveOrganizationId(
      client,
      brandId,
      input.location.organizationId,
    );
    const locationResult = await client.query<{ id: string }>(
      `
        insert into location (
          brand_id,
          organization_id,
          slug,
          name
        )
        values ($1::uuid, $2::uuid, $3, $4)
        on conflict (brand_id, slug) do update
        set
          organization_id = excluded.organization_id,
          name = excluded.name
        returning id::text
      `,
      [brandId, organizationId, input.location.slug, input.location.name],
    );
    const locationId = locationResult.rows[0].id;

    await replaceLocationFeatureFlags(client, locationId, input.location.enabledModules);

    if (input.operatingSchedule) {
      await replaceOpenScheduleRows(
        client,
        "location_schedule",
        "location_id",
        locationId,
        flattenScheduleRows(input.operatingSchedule.availability),
      );
    }
  });

  await refreshDefinitions(input.env);
};

export const persistCanonicalLocationFeatureFlags = async (input: {
  env: AppEnv;
  locationSlug: string;
  enabledModules: LocationFeature[];
}): Promise<void> => {
  await withTransaction(input.env, async (client) => {
    const brandId = await resolveBrandId(client, input.env);
    const location = await resolveLocation(client, brandId, input.locationSlug);
    await replaceLocationFeatureFlags(client, location.id, input.enabledModules);
  });

  await refreshDefinitions(input.env);
};

export const persistCanonicalService = async (
  env: AppEnv,
  service: CatalogService,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);
    const location = await resolveLocation(client, brandId, service.locationSlug);
    const { serviceId, variantId } = await upsertServiceRecord(client, brandId, service);

    await client.query(
      `
        insert into service_location_offer (
          location_id,
          service_variant_id,
          is_active,
          is_bookable,
          retail_price_cents,
          member_price_cents,
          membership_required,
          currency_code,
          feature_tags
        )
        values ($1::uuid, $2::uuid, true, $3, $4, $5, $6, $7, $8::jsonb)
        on conflict (location_id, service_variant_id) do update
        set
          is_active = excluded.is_active,
          is_bookable = excluded.is_bookable,
          retail_price_cents = excluded.retail_price_cents,
          member_price_cents = excluded.member_price_cents,
          membership_required = excluded.membership_required,
          currency_code = excluded.currency_code,
          feature_tags = excluded.feature_tags
      `,
      [
        location.id,
        variantId,
        service.bookable,
        service.price.retailAmountCents,
        service.price.memberAmountCents ?? null,
        service.price.membershipRequired,
        service.price.currency,
        JSON.stringify(service.featureTags),
      ],
    );

    await replaceServiceResourceRules(client, variantId, service);
    await replaceBookingPolicy(client, location.id, serviceId, service);
  });

  await refreshDefinitions(env);
};

export const persistCanonicalMachine = async (
  env: AppEnv,
  machine: MachineResource,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);
    const location = await resolveLocation(client, brandId, machine.locationSlug);
    const machineResult = await client.query<{ id: string }>(
      `
        insert into machine (
          brand_id,
          slug,
          display_name,
          machine_type,
          status
        )
        values ($1::uuid, $2, $3, $4, 'active')
        on conflict (brand_id, slug) do update
        set
          display_name = excluded.display_name,
          machine_type = excluded.machine_type,
          status = 'active'
        returning id::text
      `,
      [
        brandId,
        machine.slug,
        machine.name,
        machine.capabilitySlugs[0] ?? "machine",
      ],
    );
    const machineId = machineResult.rows[0].id;
    const inventoryResult = await client.query<{ id: string }>(
      `
        insert into location_machine_inventory (
          location_id,
          machine_id,
          status
        )
        values ($1::uuid, $2::uuid, 'active')
        on conflict (location_id, machine_id) do update
        set status = 'active'
        returning id::text
      `,
      [location.id, machineId],
    );
    const inventoryId = inventoryResult.rows[0].id;

    await replaceMachineCapabilities(client, machineId, machine.capabilitySlugs);
    await replaceOpenScheduleRows(
      client,
      "machine_schedule",
      "location_machine_inventory_id",
      inventoryId,
      flattenScheduleRows(machine.availability),
    );
    await replaceMachineBlockedWindows(client, inventoryId, machine.blockedWindows);
  });

  await refreshDefinitions(env);
};

export const persistCanonicalMachineScheduleTemplate = async (input: {
  env: AppEnv;
  locationSlug: string;
  machineSlug: string;
  template: RecurringTimeWindow[];
}): Promise<void> => {
  await withTransaction(input.env, async (client) => {
    const brandId = await resolveBrandId(client, input.env);
    const machine = await resolveMachineInventory(
      client,
      brandId,
      input.locationSlug,
      input.machineSlug,
    );
    await replaceOpenScheduleRows(
      client,
      "machine_schedule",
      "location_machine_inventory_id",
      machine.inventoryId,
      flattenScheduleRows(input.template),
    );
  });

  await refreshDefinitions(input.env);
};

export const persistCanonicalRoom = async (
  env: AppEnv,
  room: RoomResource,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);
    const location = await resolveLocation(client, brandId, room.locationSlug);
    const roomResult = await client.query<{ id: string }>(
      `
        insert into room (
          location_id,
          slug,
          display_name,
          status
        )
        values ($1::uuid, $2, $3, 'active')
        on conflict (location_id, slug) do update
        set
          display_name = excluded.display_name,
          status = 'active'
        returning id::text
      `,
      [location.id, room.slug, room.name],
    );
    const roomId = roomResult.rows[0].id;

    await replaceRoomCapabilities(client, roomId, room.capabilitySlugs);
    await replaceOpenScheduleRows(
      client,
      "room_schedule",
      "room_id",
      roomId,
      flattenScheduleRows(room.availability),
    );
    await replaceRoomBlockedWindows(client, roomId, room.blockedWindows);
  });

  await refreshDefinitions(env);
};

export const persistCanonicalMembershipPlan = async (
  env: AppEnv,
  plan: MembershipPlan,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);
    const location = await resolveLocation(client, brandId, plan.locationSlug);
    const membershipPlanResult = await client.query<{ id: string }>(
      `
        insert into membership_plan (
          brand_id,
          location_id,
          slug,
          display_name,
          description,
          billing_interval,
          education_only,
          is_active
        )
        values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, true)
        on conflict (brand_id, slug) do update
        set
          location_id = excluded.location_id,
          display_name = excluded.display_name,
          description = excluded.description,
          billing_interval = excluded.billing_interval,
          education_only = excluded.education_only,
          is_active = true
        returning id::text
      `,
      [
        brandId,
        location.id,
        plan.slug,
        plan.name,
        plan.description,
        plan.billingInterval,
        plan.educationOnly,
      ],
    );
    const membershipPlanId = membershipPlanResult.rows[0].id;

    await client.query(
      `
        delete from membership_price
        where membership_plan_id = $1::uuid
          and (location_id = $2::uuid or location_id is null)
      `,
      [membershipPlanId, location.id],
    );
    await client.query(
      `
        insert into membership_price (
          id,
          membership_plan_id,
          location_id,
          currency_code,
          amount_cents
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4, $5)
      `,
      [randomUUID(), membershipPlanId, location.id, plan.price.currency, plan.price.amountCents],
    );

    await client.query(
      `
        delete from membership_entitlement
        where membership_plan_id = $1::uuid
      `,
      [membershipPlanId],
    );

    for (const credit of plan.entitlements.monthlyServiceCredits) {
      const service = await resolveService(client, brandId, credit.serviceSlug);
      await client.query(
        `
          insert into membership_entitlement (
            id,
            membership_plan_id,
            entitlement_type,
            service_id,
            quantity,
            config
          )
          values ($1::uuid, $2::uuid, 'service_credit', $3::uuid, $4, $5::jsonb)
        `,
        [
          randomUUID(),
          membershipPlanId,
          service.id,
          credit.quantity,
          JSON.stringify({
            includedServiceSlugs: plan.entitlements.includedServiceSlugs,
          }),
        ],
      );
    }

    for (const offerSlug of plan.entitlements.educationOfferSlugs) {
      const educationOfferId = await resolveEducationOfferId(client, brandId, offerSlug);
      await client.query(
        `
          insert into membership_entitlement (
            id,
            membership_plan_id,
            entitlement_type,
            education_offer_id,
            config
          )
          values ($1::uuid, $2::uuid, 'education_access', $3::uuid, $4::jsonb)
        `,
        [
          randomUUID(),
          membershipPlanId,
          educationOfferId,
          JSON.stringify({
            includedServiceSlugs: plan.entitlements.includedServiceSlugs,
          }),
        ],
      );
    }

    await client.query(
      `
        insert into membership_entitlement (
          id,
          membership_plan_id,
          entitlement_type,
          discount_percent,
          config
        )
        values ($1::uuid, $2::uuid, 'member_discount', $3, $4::jsonb)
      `,
      [
        randomUUID(),
        membershipPlanId,
        plan.entitlements.memberDiscountPercent,
        JSON.stringify({
          includedServiceSlugs: plan.entitlements.includedServiceSlugs,
        }),
      ],
    );
  });

  await refreshDefinitions(env);
};

export const persistCanonicalProviderCompPlan = async (
  env: AppEnv,
  plan: ProviderCompPlan,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);
    const location = await resolveLocation(client, brandId, plan.locationSlug);
    const providerId = await resolveProvider(client, brandId, plan.providerSlug);
    const serviceId = plan.serviceSlug
      ? (await resolveService(client, brandId, plan.serviceSlug)).id
      : undefined;

    await client.query(
      `
        update provider_comp_plan
        set ends_at = now()
        where brand_id = $1::uuid
          and location_id = $2::uuid
          and provider_id = $3::uuid
          and ends_at is null
          and (
            ($4::uuid is null and service_id is null)
            or service_id = $4::uuid
          )
      `,
      [brandId, location.id, providerId, serviceId ?? null],
    );

    await client.query(
      `
        insert into provider_comp_plan (
          id,
          brand_id,
          provider_id,
          location_id,
          service_id,
          plan_name,
          commission_percent,
          applies_to_revenue_stream,
          starts_at,
          ends_at
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, now(), null)
      `,
      [
        randomUUID(),
        brandId,
        providerId,
        location.id,
        serviceId ?? null,
        `${plan.providerSlug}${plan.serviceSlug ? `-${plan.serviceSlug}` : "-default"}-commission`,
        plan.commissionPercent,
        plan.appliesToRevenueStream,
      ],
    );
  });

  await refreshDefinitions(env);
};

export const persistCanonicalProvider = async (
  env: AppEnv,
  provider: ProviderResource,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);
    const location = await resolveLocation(client, brandId, provider.locationSlug);
    const userId = provider.email
      ? await upsertAppUser(client, provider.email, provider.name)
      : null;
    const providerResult = await client.query<{ id: string }>(
      `
        insert into provider (
          user_id,
          brand_id,
          slug,
          display_name,
          provider_type,
          status
        )
        values ($1::uuid, $2::uuid, $3, $4, 'independent', 'active')
        on conflict (brand_id, slug) do update
        set
          user_id = excluded.user_id,
          display_name = excluded.display_name,
          status = 'active'
        returning id::text
      `,
      [userId, brandId, provider.slug, provider.name],
    );
    const providerId = providerResult.rows[0].id;
    const assignmentResult = await client.query<{ id: string }>(
      `
        insert into provider_role_assignment (
          id,
          provider_id,
          organization_id,
          location_id,
          role_label
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'provider')
        on conflict (provider_id, location_id) do update
        set organization_id = excluded.organization_id
        returning id::text
      `,
      [randomUUID(), providerId, location.organizationId, location.id],
    );
    const providerRoleAssignmentId = assignmentResult.rows[0].id;

    await client.query(
      `
        delete from provider_service_assignment
        where provider_role_assignment_id = $1::uuid
      `,
      [providerRoleAssignmentId],
    );

    for (const serviceSlug of provider.serviceSlugs) {
      const service = await resolveService(client, brandId, serviceSlug);
      await client.query(
        `
          insert into provider_service_assignment (
            id,
            provider_role_assignment_id,
            service_id
          )
          values ($1::uuid, $2::uuid, $3::uuid)
        `,
        [randomUUID(), providerRoleAssignmentId, service.id],
      );
    }

    await replaceOpenScheduleRows(
      client,
      "provider_schedule_template",
      "provider_id",
      providerId,
      flattenScheduleRows(provider.availability),
      {
        locationId: location.id,
      },
    );
    await replaceProviderExceptions(client, providerId, location.id, provider.blockedWindows ?? []);
  });

  await refreshDefinitions(env);
};

export const persistCanonicalProviderScheduleTemplate = async (input: {
  env: AppEnv;
  locationSlug: string;
  providerSlug: string;
  template: RecurringTimeWindow[];
}): Promise<void> => {
  await withTransaction(input.env, async (client) => {
    const brandId = await resolveBrandId(client, input.env);
    const location = await resolveLocation(client, brandId, input.locationSlug);
    const providerId = await resolveProvider(client, brandId, input.providerSlug);
    await replaceOpenScheduleRows(
      client,
      "provider_schedule_template",
      "provider_id",
      providerId,
      flattenScheduleRows(input.template),
      {
        locationId: location.id,
      },
    );
  });

  await refreshDefinitions(input.env);
};

export const persistCanonicalProviderExceptions = async (input: {
  env: AppEnv;
  locationSlug: string;
  providerSlug: string;
  windows: Array<{ startAt: string; endAt: string }>;
}): Promise<void> => {
  await withTransaction(input.env, async (client) => {
    const brandId = await resolveBrandId(client, input.env);
    const location = await resolveLocation(client, brandId, input.locationSlug);
    const providerId = await resolveProvider(client, brandId, input.providerSlug);
    await replaceProviderExceptions(client, providerId, location.id, input.windows);
  });

  await refreshDefinitions(input.env);
};

export const persistCanonicalCoupon = async (
  env: AppEnv,
  coupon: CouponDefinition,
): Promise<void> => {
  await withTransaction(env, async (client) => {
    const brandId = await resolveBrandId(client, env);
    const location = await resolveLocation(client, brandId, coupon.locationSlug);
    const config = {
      name: coupon.name,
      currency: coupon.amountOff?.currency ?? "CAD",
      appliesToKinds: coupon.appliesToKinds,
      appliesToRevenueStreams: coupon.appliesToRevenueStreams,
      eligibleReferenceIds: coupon.eligibleReferenceIds ?? [],
    };
    const discountType = coupon.discountType === "fixed_amount" ? "fixed" : "percent";
    const discountValue =
      coupon.discountType === "fixed_amount"
        ? coupon.amountOff?.amountCents ?? 0
        : coupon.percentOff ?? 0;

    const existing = await client.query<{ id: string; location_id: string | null }>(
      `
        select id::text, location_id::text
        from coupon
        where brand_id = $1::uuid
          and lower(code) = lower($2)
        limit 1
      `,
      [brandId, coupon.code],
    );

    if (
      (existing.rowCount ?? 0) > 0 &&
      existing.rows[0].location_id &&
      existing.rows[0].location_id !== location.id
    ) {
      throw new Error(
        `Coupon ${coupon.code} already exists for another location in the canonical schema.`,
      );
    }

    await client.query(
      `
        insert into coupon (
          id,
          brand_id,
          location_id,
          code,
          description,
          discount_type,
          discount_value,
          applies_to_revenue_stream,
          is_active,
          stackable,
          config
        )
        values (
          coalesce($1::uuid, gen_random_uuid()),
          $2::uuid,
          $3::uuid,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb
        )
        on conflict (brand_id, code) do update
        set
          location_id = excluded.location_id,
          description = excluded.description,
          discount_type = excluded.discount_type,
          discount_value = excluded.discount_value,
          applies_to_revenue_stream = excluded.applies_to_revenue_stream,
          is_active = excluded.is_active,
          stackable = excluded.stackable,
          config = excluded.config
      `,
      [
        existing.rows[0]?.id ?? null,
        brandId,
        location.id,
        coupon.code,
        coupon.name,
        discountType,
        discountValue,
        coupon.appliesToRevenueStreams[0] ?? null,
        coupon.status === "active",
        coupon.stackable,
        JSON.stringify(config),
      ],
    );
  });

  await refreshDefinitions(env);
};

export const persistCanonicalEducationOffer = async (input: {
  env: AppEnv;
  offer: {
    slug: string;
    locationSlug: string;
    title: string;
    shortDescription: string;
    status: "draft" | "published";
    moduleSlugs: string[];
    membershipEligible: boolean;
    staffGrantEnabled: boolean;
    price: {
      currency: string;
      amountCents: number;
      isFree: boolean;
    };
  };
}): Promise<void> => {
  await withTransaction(input.env, async (client) => {
    const brandId = await resolveBrandId(client, input.env);
    const location = await resolveLocation(client, brandId, input.offer.locationSlug);
    const educationOfferResult = await client.query<{ id: string }>(
      `
        insert into education_offer (
          brand_id,
          location_id,
          slug,
          title,
          short_description,
          status,
          currency_code,
          price_cents,
          is_free,
          config
        )
        values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        on conflict (brand_id, slug) do update
        set
          location_id = excluded.location_id,
          title = excluded.title,
          short_description = excluded.short_description,
          status = excluded.status,
          currency_code = excluded.currency_code,
          price_cents = excluded.price_cents,
          is_free = excluded.is_free,
          config = excluded.config
        returning id::text
      `,
      [
        brandId,
        location.id,
        input.offer.slug,
        input.offer.title,
        input.offer.shortDescription,
        input.offer.status,
        input.offer.price.currency,
        input.offer.price.isFree ? 0 : input.offer.price.amountCents,
        input.offer.price.isFree,
        JSON.stringify({
          membershipEligible: input.offer.membershipEligible,
          staffGrantEnabled: input.offer.staffGrantEnabled,
        }),
      ],
    );
    const educationOfferId = educationOfferResult.rows[0].id;
    const courseId = await upsertCourse(
      client,
      brandId,
      input.offer.slug,
      input.offer.title,
      input.offer.shortDescription,
    );

    await client.query(
      `
        delete from education_offer_item
        where education_offer_id = $1::uuid
      `,
      [educationOfferId],
    );

    for (const [index, moduleSlug] of input.offer.moduleSlugs.entries()) {
      const moduleId = await upsertModule(client, courseId, moduleSlug, index + 1);
      await client.query(
        `
          insert into education_offer_item (
            id,
            education_offer_id,
            module_id,
            item_type
          )
          values ($1::uuid, $2::uuid, $3::uuid, 'module')
        `,
        [randomUUID(), educationOfferId, moduleId],
      );
    }
  });

  await refreshDefinitions(input.env);
};

export const persistCanonicalServicePackage = async (input: {
  env: AppEnv;
  servicePackage: {
    slug: string;
    locationSlug: string;
    name: string;
    shortDescription: string;
    status: "draft" | "published";
    price: {
      currency: string;
      amountCents: number;
    };
    serviceCredits: Array<{
      serviceSlug: string;
      quantity: number;
    }>;
    featureTags: string[];
  };
}): Promise<void> => {
  await withTransaction(input.env, async (client) => {
    const brandId = await resolveBrandId(client, input.env);
    const location = await resolveLocation(
      client,
      brandId,
      input.servicePackage.locationSlug,
    );
    const offerResult = await client.query<{ id: string }>(
      `
        insert into service_package_offer (
          brand_id,
          location_id,
          slug,
          display_name,
          short_description,
          status,
          currency_code,
          price_amount_cents,
          feature_tags
        )
        values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb)
        on conflict (location_id, slug) do update
        set
          display_name = excluded.display_name,
          short_description = excluded.short_description,
          status = excluded.status,
          currency_code = excluded.currency_code,
          price_amount_cents = excluded.price_amount_cents,
          feature_tags = excluded.feature_tags
        returning id::text
      `,
      [
        brandId,
        location.id,
        input.servicePackage.slug,
        input.servicePackage.name,
        input.servicePackage.shortDescription,
        input.servicePackage.status,
        input.servicePackage.price.currency,
        input.servicePackage.price.amountCents,
        JSON.stringify(input.servicePackage.featureTags),
      ],
    );
    const offerId = offerResult.rows[0].id;

    await client.query(
      `
        delete from service_package_credit
        where service_package_offer_id = $1::uuid
      `,
      [offerId],
    );

    for (const credit of input.servicePackage.serviceCredits) {
      const service = await resolveService(client, brandId, credit.serviceSlug);
      await client.query(
        `
          insert into service_package_credit (
            id,
            service_package_offer_id,
            service_id,
            quantity
          )
          values ($1::uuid, $2::uuid, $3::uuid, $4)
        `,
        [randomUUID(), offerId, service.id, credit.quantity],
      );
    }
  });

  await refreshDefinitions(input.env);
};
