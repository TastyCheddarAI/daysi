import type { Pool } from "pg";

import type {
  CouponDefinition,
  EducationOffer,
  LocationFeature,
  LocationOperatingSchedule,
  MachineResource,
  MembershipEntitlement,
  MembershipPlan,
  ProviderCompPlan,
  ProviderResource,
  RecurringTimeWindow,
  RoomResource,
  ServicePackageOffer,
  TenantContext,
  TenantLocation,
  TenantOrganization,
} from "../../../../packages/domain/src";
import type { CatalogProduct, CatalogService } from "../../../../packages/domain/src";

import { buildBootstrapClinicData } from "../bootstrap-clinic-data";
import type { BootstrapClinicData } from "../bootstrap-clinic-data";
import type { AppEnv } from "../config";
import type { ClinicDefinitionRepository } from "./clinic-definition-repository";

type Queryable = Pick<Pool, "query">;

interface Snapshot {
  tenantContext: TenantContext;
  clinicData: BootstrapClinicData;
}

const parseJsonRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseJsonStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const toRecurringWindows = (
  rows: Array<{ day_of_week: number; start_minute: number; end_minute: number }>,
): RecurringTimeWindow[] =>
  rows.map((row) => ({
    daysOfWeek: [row.day_of_week],
    startMinute: row.start_minute,
    endMinute: row.end_minute,
  }));

const buildScopedKey = (locationSlug: string, slug: string): string =>
  `${locationSlug}::${slug}`;

const defaultCouponKindsForRevenueStream = (
  revenueStream: "services" | "memberships" | "retail" | "education" | null,
): CouponDefinition["appliesToKinds"] => {
  switch (revenueStream) {
    case "services":
      return ["booking"];
    case "memberships":
      return ["membershipPlan"];
    case "retail":
      return ["product"];
    case "education":
      return ["educationOffer"];
    default:
      return ["booking", "membershipPlan", "product", "servicePackage", "educationOffer"];
  }
};

const defaultCouponRevenueStreams = (
  revenueStream: "services" | "memberships" | "retail" | "education" | null,
): CouponDefinition["appliesToRevenueStreams"] =>
  revenueStream
    ? [revenueStream]
    : ["services", "memberships", "retail", "education", "packages"];

const buildCacheKey = (env: AppEnv): string =>
  [
    env.DAYSI_ENV,
    env.DAYSI_BRAND_SLUG,
    env.DAYSI_DEFAULT_LOCATION_SLUG,
    env.DAYSI_CLINIC_DEFINITION_REPOSITORY,
  ].join("::");

const buildSnapshot = async (db: Queryable, env: AppEnv): Promise<Snapshot> => {
  const brandResult = await db.query<{
    id: string;
    slug: string;
    name: string;
    primary_domain: string;
  }>(
    `
      select id::text, slug, name, primary_domain
      from brand
      where slug = $1
      limit 1
    `,
    [env.DAYSI_BRAND_SLUG],
  );

  if (brandResult.rowCount === 0) {
    throw new Error(
      `Brand ${env.DAYSI_BRAND_SLUG} is not available in Postgres clinic definitions.`,
    );
  }

  const brand = brandResult.rows[0];
  const bootstrap = buildBootstrapClinicData(env);

  const [
    organizationsResult,
    locationsResult,
    servicesResult,
    serviceMachineCapabilitiesResult,
    serviceRoomCapabilitiesResult,
    productsResult,
    educationOffersResult,
    educationOfferItemsResult,
    servicePackagesResult,
    servicePackageCreditsResult,
    couponsResult,
    membershipPlansResult,
    membershipEntitlementsResult,
    providerCompPlansResult,
    locationSchedulesResult,
    providersResult,
    providerServicesResult,
    providerSchedulesResult,
    providerExceptionsResult,
    machinesResult,
    machineCapabilitiesResult,
    machineSchedulesResult,
    machineWindowsResult,
    roomsResult,
    roomCapabilitiesResult,
    roomSchedulesResult,
    roomWindowsResult,
  ] = await Promise.all([
    db.query<{ id: string; slug: string; name: string; operating_mode: "corporate" | "franchise" }>(
      `
        select id::text, slug, name, operating_mode
        from organization
        where brand_id = $1::uuid
        order by created_at asc, slug asc
      `,
      [brand.id],
    ),
    db.query<{
      id: string;
      slug: string;
      name: string;
      organization_id: string;
      enabled_modules: string[] | null;
    }>(
      `
        select
          l.id::text,
          l.slug,
          l.name,
          l.organization_id::text,
          coalesce(array_agg(lff.feature_key) filter (where lff.enabled), '{}'::text[]) as enabled_modules
        from location as l
        left join location_feature_flag as lff on lff.location_id = l.id
        where l.brand_id = $1::uuid
        group by l.id, l.slug, l.name, l.organization_id, l.created_at
        order by l.created_at asc, l.slug asc
      `,
      [brand.id],
    ),
    db.query<{
      id: string;
      location_slug: string;
      slug: string;
      variant_slug: string;
      category_slug: string | null;
      name: string;
      short_description: string;
      description: string;
      duration_minutes: number;
      is_bookable: boolean;
      currency_code: string;
      retail_price_cents: number;
      member_price_cents: number | null;
      membership_required: boolean;
      cancellation_window_hours: number | null;
      buffer_minutes: number | null;
      requires_deposit: boolean | null;
      feature_tags: unknown;
    }>(
      `
        select
          s.id::text,
          l.slug as location_slug,
          s.slug,
          sv.slug as variant_slug,
          sc.slug as category_slug,
          s.display_name as name,
          s.short_description,
          s.description,
          sv.duration_minutes,
          slo.is_bookable,
          slo.currency_code,
          slo.retail_price_cents,
          slo.member_price_cents,
          slo.membership_required,
          bp.cancellation_window_hours,
          bp.buffer_minutes,
          bp.requires_deposit,
          slo.feature_tags
        from service_location_offer as slo
        join location as l on l.id = slo.location_id
        join service_variant as sv on sv.id = slo.service_variant_id
        join service as s on s.id = sv.service_id
        left join service_category as sc on sc.id = s.service_category_id
        left join booking_policy as bp on bp.location_id = l.id and bp.service_id = s.id
        where l.brand_id = $1::uuid and slo.is_active
        order by l.slug asc, s.slug asc, sv.slug asc
      `,
      [brand.id],
    ),
    db.query<{ variant_slug: string; capability_key: string }>(
      `
        select sv.slug as variant_slug, msr.capability_key
        from machine_service_rule as msr
        join service_variant as sv on sv.id = msr.service_variant_id
        join service as s on s.id = sv.service_id
        where s.brand_id = $1::uuid
        order by sv.slug asc, msr.capability_key asc
      `,
      [brand.id],
    ),
    db.query<{ variant_slug: string; capability_key: string }>(
      `
        select sv.slug as variant_slug, srr.capability_key
        from service_room_rule as srr
        join service_variant as sv on sv.id = srr.service_variant_id
        join service as s on s.id = sv.service_id
        where s.brand_id = $1::uuid
        order by sv.slug asc, srr.capability_key asc
      `,
      [brand.id],
    ),
    db.query<{ id: string; location_slug: string; slug: string; name: string; short_description: string; currency_code: string; price_cents: number }>(
      `
        select
          p.id::text,
          l.slug as location_slug,
          p.slug,
          p.display_name as name,
          p.short_description,
          plo.currency_code,
          plo.price_cents
        from product_location_offer as plo
        join location as l on l.id = plo.location_id
        join product as p on p.id = plo.product_id
        where l.brand_id = $1::uuid and plo.is_active
        order by l.slug asc, p.slug asc
      `,
      [brand.id],
    ),
    db.query<{
      id: string;
      location_slug: string;
      slug: string;
      title: string;
      short_description: string;
      status: "draft" | "published";
      currency_code: string;
      price_cents: number;
      is_free: boolean;
      config: unknown;
    }>(
      `
        select
          eo.id::text,
          l.slug as location_slug,
          eo.slug,
          eo.title,
          eo.short_description,
          eo.status,
          eo.currency_code,
          eo.price_cents,
          eo.is_free,
          eo.config
        from education_offer as eo
        join location as l on l.id = eo.location_id
        where eo.brand_id = $1::uuid
        order by l.slug asc, eo.slug asc
      `,
      [brand.id],
    ),
    db.query<{ offer_id: string; module_slug: string }>(
      `
        select distinct
          eoi.education_offer_id::text as offer_id,
          coalesce(module_item.slug, course_module.slug) as module_slug
        from education_offer_item as eoi
        left join module as module_item on module_item.id = eoi.module_id
        left join course as course_item on course_item.id = eoi.course_id
        left join module as course_module on course_module.course_id = course_item.id
        join education_offer as eo on eo.id = eoi.education_offer_id
        where eo.brand_id = $1::uuid
          and coalesce(module_item.slug, course_module.slug) is not null
        order by offer_id asc, module_slug asc
      `,
      [brand.id],
    ),
    db.query<{
      id: string;
      location_slug: string;
      slug: string;
      name: string;
      short_description: string;
      status: "draft" | "published";
      currency_code: string;
      price_amount_cents: number;
      feature_tags: unknown;
    }>(
      `
        select
          spo.id::text,
          l.slug as location_slug,
          spo.slug,
          spo.display_name as name,
          spo.short_description,
          spo.status,
          spo.currency_code,
          spo.price_amount_cents,
          spo.feature_tags
        from service_package_offer as spo
        join location as l on l.id = spo.location_id
        where spo.brand_id = $1::uuid
        order by l.slug asc, spo.slug asc
      `,
      [brand.id],
    ),
    db.query<{ offer_id: string; service_slug: string; quantity: number }>(
      `
        select
          spc.service_package_offer_id::text as offer_id,
          s.slug as service_slug,
          spc.quantity
        from service_package_credit as spc
        join service as s on s.id = spc.service_id
        join service_package_offer as spo on spo.id = spc.service_package_offer_id
        where spo.brand_id = $1::uuid
        order by offer_id asc, s.slug asc
      `,
      [brand.id],
    ),
    db.query<{
      id: string;
      location_slug: string | null;
      code: string;
      name: string | null;
      is_active: boolean;
      stackable: boolean;
      discount_type: "fixed" | "percent";
      discount_value: string;
      applies_to_revenue_stream: "services" | "memberships" | "retail" | "education" | null;
      config: unknown;
    }>(
      `
        select
          c.id::text,
          l.slug as location_slug,
          c.code,
          nullif(c.config ->> 'name', '') as name,
          c.is_active,
          c.stackable,
          c.discount_type,
          c.discount_value::text,
          c.applies_to_revenue_stream,
          c.config
        from coupon as c
        left join location as l on l.id = c.location_id
        where c.brand_id = $1::uuid
        order by c.created_at asc, c.code asc
      `,
      [brand.id],
    ),
    db.query<{
      id: string;
      location_slug: string;
      slug: string;
      name: string;
      description: string;
      billing_interval: "month";
      education_only: boolean;
      currency_code: string;
      amount_cents: number;
    }>(
      `
        select
          mp.id::text,
          l.slug as location_slug,
          mp.slug,
          mp.display_name as name,
          mp.description,
          mp.billing_interval,
          mp.education_only,
          coalesce(mp_price.currency_code, 'CAD') as currency_code,
          coalesce(mp_price.amount_cents, 0) as amount_cents
        from membership_plan as mp
        join location as l on l.id = mp.location_id
        left join lateral (
          select currency_code, amount_cents
          from membership_price
          where membership_plan_id = mp.id
            and (location_id = mp.location_id or location_id is null)
            and (ends_at is null or ends_at > now())
          order by case when location_id = mp.location_id then 0 else 1 end, starts_at desc
          limit 1
        ) as mp_price on true
        where mp.brand_id = $1::uuid and mp.is_active
        order by l.slug asc, mp.slug asc
      `,
      [brand.id],
    ),
    db.query<{
      plan_id: string;
      entitlement_type: "service_credit" | "member_discount" | "education_access";
      service_slug: string | null;
      education_offer_slug: string | null;
      quantity: number | null;
      discount_percent: string | null;
      config: unknown;
    }>(
      `
        select
          me.membership_plan_id::text as plan_id,
          me.entitlement_type,
          s.slug as service_slug,
          eo.slug as education_offer_slug,
          me.quantity,
          me.discount_percent::text,
          me.config
        from membership_entitlement as me
        join membership_plan as mp on mp.id = me.membership_plan_id
        left join service as s on s.id = me.service_id
        left join education_offer as eo on eo.id = me.education_offer_id
        where mp.brand_id = $1::uuid
        order by plan_id asc, me.created_at asc
      `,
      [brand.id],
    ),
    db.query<{
      provider_slug: string;
      location_slug: string;
      service_slug: string | null;
      commission_percent: string;
      applies_to_revenue_stream: "services" | "retail" | "mixed";
    }>(
      `
        select
          p.slug as provider_slug,
          l.slug as location_slug,
          s.slug as service_slug,
          pcp.commission_percent::text,
          pcp.applies_to_revenue_stream
        from provider_comp_plan as pcp
        join provider as p on p.id = pcp.provider_id
        join location as l on l.id = pcp.location_id
        left join service as s on s.id = pcp.service_id
        where pcp.brand_id = $1::uuid and pcp.ends_at is null
        order by l.slug asc, p.slug asc, s.slug asc nulls first
      `,
      [brand.id],
    ),
    db.query<{ location_slug: string; day_of_week: number; start_minute: number; end_minute: number }>(
      `
        select
          l.slug as location_slug,
          ls.day_of_week,
          ls.start_minute,
          ls.end_minute
        from location_schedule as ls
        join location as l on l.id = ls.location_id
        where l.brand_id = $1::uuid and ls.schedule_kind = 'open'
        order by l.slug asc, ls.day_of_week asc, ls.start_minute asc
      `,
      [brand.id],
    ),
    db.query<{ assignment_id: string; provider_slug: string; provider_name: string; provider_email: string | null; location_slug: string }>(
      `
        select
          pra.id::text as assignment_id,
          p.slug as provider_slug,
          p.display_name as provider_name,
          au.email as provider_email,
          l.slug as location_slug
        from provider_role_assignment as pra
        join provider as p on p.id = pra.provider_id
        join location as l on l.id = pra.location_id
        left join app_user as au on au.id = p.user_id
        where p.brand_id = $1::uuid
        order by l.slug asc, p.slug asc
      `,
      [brand.id],
    ),
    db.query<{ assignment_id: string; service_slug: string }>(
      `
        select psa.provider_role_assignment_id::text as assignment_id, s.slug as service_slug
        from provider_service_assignment as psa
        join service as s on s.id = psa.service_id
        join provider_role_assignment as pra on pra.id = psa.provider_role_assignment_id
        join provider as p on p.id = pra.provider_id
        where p.brand_id = $1::uuid
        order by assignment_id asc, s.slug asc
      `,
      [brand.id],
    ),
    db.query<{ provider_slug: string; location_slug: string; day_of_week: number; start_minute: number; end_minute: number }>(
      `
        select
          p.slug as provider_slug,
          l.slug as location_slug,
          pst.day_of_week,
          pst.start_minute,
          pst.end_minute
        from provider_schedule_template as pst
        join provider as p on p.id = pst.provider_id
        join location as l on l.id = pst.location_id
        where p.brand_id = $1::uuid
        order by l.slug asc, p.slug asc, pst.day_of_week asc, pst.start_minute asc
      `,
      [brand.id],
    ),
    db.query<{ provider_slug: string; location_slug: string; starts_at: string; ends_at: string }>(
      `
        select
          p.slug as provider_slug,
          l.slug as location_slug,
          pse.starts_at::text,
          pse.ends_at::text
        from provider_schedule_exception as pse
        join provider as p on p.id = pse.provider_id
        join location as l on l.id = pse.location_id
        where p.brand_id = $1::uuid
        order by l.slug asc, p.slug asc, pse.starts_at asc
      `,
      [brand.id],
    ),
    db.query<{ machine_slug: string; machine_name: string; location_slug: string }>(
      `
        select
          m.slug as machine_slug,
          m.display_name as machine_name,
          l.slug as location_slug
        from location_machine_inventory as lmi
        join machine as m on m.id = lmi.machine_id
        join location as l on l.id = lmi.location_id
        where l.brand_id = $1::uuid and lmi.status = 'active' and m.status = 'active'
        order by l.slug asc, m.slug asc
      `,
      [brand.id],
    ),
    db.query<{ machine_slug: string; location_slug: string; capability_key: string }>(
      `
        select
          m.slug as machine_slug,
          l.slug as location_slug,
          mc.capability_key
        from location_machine_inventory as lmi
        join machine as m on m.id = lmi.machine_id
        join location as l on l.id = lmi.location_id
        join machine_capability as mc on mc.machine_id = m.id
        where l.brand_id = $1::uuid and lmi.status = 'active'
        order by l.slug asc, m.slug asc, mc.capability_key asc
      `,
      [brand.id],
    ),
    db.query<{ machine_slug: string; location_slug: string; day_of_week: number; start_minute: number; end_minute: number }>(
      `
        select
          m.slug as machine_slug,
          l.slug as location_slug,
          ms.day_of_week,
          ms.start_minute,
          ms.end_minute
        from machine_schedule as ms
        join location_machine_inventory as lmi on lmi.id = ms.location_machine_inventory_id
        join machine as m on m.id = lmi.machine_id
        join location as l on l.id = lmi.location_id
        where l.brand_id = $1::uuid and ms.schedule_kind = 'open'
        order by l.slug asc, m.slug asc, ms.day_of_week asc, ms.start_minute asc
      `,
      [brand.id],
    ),
    db.query<{ resource_slug: string; location_slug: string; starts_at: string; ends_at: string }>(
      `
        select
          m.slug as resource_slug,
          l.slug as location_slug,
          mbw.starts_at::text,
          mbw.ends_at::text
        from machine_booking_window as mbw
        join location_machine_inventory as lmi on lmi.id = mbw.location_machine_inventory_id
        join machine as m on m.id = lmi.machine_id
        join location as l on l.id = lmi.location_id
        where l.brand_id = $1::uuid and mbw.booking_id is null
        order by l.slug asc, m.slug asc, mbw.starts_at asc
      `,
      [brand.id],
    ),
    db.query<{ room_slug: string; room_name: string; location_slug: string }>(
      `
        select
          r.slug as room_slug,
          r.display_name as room_name,
          l.slug as location_slug
        from room as r
        join location as l on l.id = r.location_id
        where l.brand_id = $1::uuid and r.status = 'active'
        order by l.slug asc, r.slug asc
      `,
      [brand.id],
    ),
    db.query<{ room_slug: string; location_slug: string; capability_key: string }>(
      `
        select
          r.slug as room_slug,
          l.slug as location_slug,
          rc.capability_key
        from room_capability as rc
        join room as r on r.id = rc.room_id
        join location as l on l.id = r.location_id
        where l.brand_id = $1::uuid
        order by l.slug asc, r.slug asc, rc.capability_key asc
      `,
      [brand.id],
    ),
    db.query<{ room_slug: string; location_slug: string; day_of_week: number; start_minute: number; end_minute: number }>(
      `
        select
          r.slug as room_slug,
          l.slug as location_slug,
          rs.day_of_week,
          rs.start_minute,
          rs.end_minute
        from room_schedule as rs
        join room as r on r.id = rs.room_id
        join location as l on l.id = r.location_id
        where l.brand_id = $1::uuid and rs.schedule_kind = 'open'
        order by l.slug asc, r.slug asc, rs.day_of_week asc, rs.start_minute asc
      `,
      [brand.id],
    ),
    db.query<{ resource_slug: string; location_slug: string; starts_at: string; ends_at: string }>(
      `
        select
          r.slug as resource_slug,
          l.slug as location_slug,
          rbw.starts_at::text,
          rbw.ends_at::text
        from room_booking_window as rbw
        join room as r on r.id = rbw.room_id
        join location as l on l.id = r.location_id
        where l.brand_id = $1::uuid and rbw.booking_id is null
        order by l.slug asc, r.slug asc, rbw.starts_at asc
      `,
      [brand.id],
    ),
  ]);

  const organizations: TenantOrganization[] = organizationsResult.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    operatingMode: row.operating_mode,
  }));
  const locations: TenantLocation[] = locationsResult.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    organizationId: row.organization_id,
    enabledModules: (row.enabled_modules ?? []) as LocationFeature[],
  }));

  const serviceMachineCapabilities = new Map<string, string[]>();
  for (const row of serviceMachineCapabilitiesResult.rows) {
    serviceMachineCapabilities.set(row.variant_slug, [
      ...(serviceMachineCapabilities.get(row.variant_slug) ?? []),
      row.capability_key,
    ]);
  }
  const serviceRoomCapabilities = new Map<string, string[]>();
  for (const row of serviceRoomCapabilitiesResult.rows) {
    serviceRoomCapabilities.set(row.variant_slug, [
      ...(serviceRoomCapabilities.get(row.variant_slug) ?? []),
      row.capability_key,
    ]);
  }

  const services: CatalogService[] = servicesResult.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    variantSlug: row.variant_slug,
    categorySlug: row.category_slug ?? "uncategorized",
    locationSlug: row.location_slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    durationMinutes: row.duration_minutes,
    bookable: row.is_bookable,
    price: {
      currency: row.currency_code,
      retailAmountCents: row.retail_price_cents,
      memberAmountCents: row.member_price_cents ?? undefined,
      membershipRequired: row.membership_required,
    },
    bookingPolicy: {
      cancellationWindowHours: row.cancellation_window_hours ?? 24,
      bufferMinutes: row.buffer_minutes ?? 0,
      requiresDeposit: row.requires_deposit ?? false,
    },
    machineCapabilities: serviceMachineCapabilities.get(row.variant_slug) ?? [],
    roomCapabilities:
      (serviceRoomCapabilities.get(row.variant_slug) ?? []).length > 0
        ? serviceRoomCapabilities.get(row.variant_slug)
        : undefined,
    featureTags: parseJsonStringArray(row.feature_tags),
  }));

  const products: CatalogProduct[] = productsResult.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    locationSlug: row.location_slug,
    name: row.name,
    shortDescription: row.short_description,
    price: {
      currency: row.currency_code,
      amountCents: row.price_cents,
    },
  }));

  const educationOfferModuleRows = new Map<string, string[]>();
  for (const row of educationOfferItemsResult.rows) {
    educationOfferModuleRows.set(row.offer_id, [
      ...(educationOfferModuleRows.get(row.offer_id) ?? []),
      row.module_slug,
    ]);
  }
  const educationOffers: EducationOffer[] = educationOffersResult.rows.map((row) => {
    const config = parseJsonRecord(row.config);
    return {
      id: row.id,
      slug: row.slug,
      locationSlug: row.location_slug,
      title: row.title,
      shortDescription: row.short_description,
      status: row.status,
      moduleSlugs: educationOfferModuleRows.get(row.id) ?? [],
      membershipEligible: config.membershipEligible === true,
      staffGrantEnabled: config.staffGrantEnabled === true,
      requiresEntitlement: true,
      price: {
        currency: row.currency_code,
        amountCents: row.price_cents,
        isFree: row.is_free,
      },
    };
  });

  const servicePackageCreditRows = new Map<string, ServicePackageOffer["serviceCredits"]>();
  for (const row of servicePackageCreditsResult.rows) {
    servicePackageCreditRows.set(row.offer_id, [
      ...(servicePackageCreditRows.get(row.offer_id) ?? []),
      {
        serviceSlug: row.service_slug,
        quantity: row.quantity,
      },
    ]);
  }
  const servicePackages: ServicePackageOffer[] = servicePackagesResult.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    locationSlug: row.location_slug,
    name: row.name,
    shortDescription: row.short_description,
    status: row.status,
    price: {
      currency: row.currency_code,
      amountCents: row.price_amount_cents,
    },
    serviceCredits: servicePackageCreditRows.get(row.id) ?? [],
    featureTags: parseJsonStringArray(row.feature_tags),
  }));

  const coupons: CouponDefinition[] = couponsResult.rows.map((row) => {
    const config = parseJsonRecord(row.config);
    const configuredKinds = parseJsonStringArray(config.appliesToKinds);
    const configuredRevenueStreams = parseJsonStringArray(config.appliesToRevenueStreams);
    const amount = Number(row.discount_value);

    return {
      id: row.id,
      code: row.code.toUpperCase(),
      name: row.name ?? row.code.toUpperCase(),
      locationSlug: row.location_slug ?? env.DAYSI_DEFAULT_LOCATION_SLUG,
      status: row.is_active ? "active" : "inactive",
      stackable: row.stackable,
      discountType: row.discount_type === "fixed" ? "fixed_amount" : "percent",
      percentOff: row.discount_type === "percent" ? amount : undefined,
      amountOff:
        row.discount_type === "fixed"
          ? {
              currency: typeof config.currency === "string" ? config.currency : "CAD",
              amountCents: amount,
            }
          : undefined,
      appliesToKinds:
        configuredKinds.length > 0
          ? (configuredKinds as CouponDefinition["appliesToKinds"])
          : defaultCouponKindsForRevenueStream(row.applies_to_revenue_stream),
      appliesToRevenueStreams:
        configuredRevenueStreams.length > 0
          ? (configuredRevenueStreams as CouponDefinition["appliesToRevenueStreams"])
          : defaultCouponRevenueStreams(row.applies_to_revenue_stream),
      eligibleReferenceIds: parseJsonStringArray(config.eligibleReferenceIds),
    };
  });

  const membershipEntitlementRows = new Map<string, MembershipEntitlement>();
  for (const row of membershipEntitlementsResult.rows) {
    const next =
      membershipEntitlementRows.get(row.plan_id) ??
      ({
        includedServiceSlugs: [],
        educationOfferSlugs: [],
        monthlyServiceCredits: [],
        memberDiscountPercent: 0,
      } satisfies MembershipEntitlement);
    const config = parseJsonRecord(row.config);
    const configuredIncludedServiceSlugs = parseJsonStringArray(
      config.includedServiceSlugs,
    );
    if (configuredIncludedServiceSlugs.length > 0) {
      next.includedServiceSlugs = configuredIncludedServiceSlugs;
    }

    if (row.entitlement_type === "service_credit" && row.service_slug && row.quantity) {
      next.monthlyServiceCredits.push({
        serviceSlug: row.service_slug,
        quantity: row.quantity,
      });
    }

    if (row.entitlement_type === "education_access" && row.education_offer_slug) {
      next.educationOfferSlugs.push(row.education_offer_slug);
    }

    if (row.entitlement_type === "member_discount") {
      next.memberDiscountPercent = Number(row.discount_percent ?? 0);
    }

    membershipEntitlementRows.set(row.plan_id, next);
  }
  const membershipPlans: MembershipPlan[] = membershipPlansResult.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    locationSlug: row.location_slug,
    name: row.name,
    description: row.description,
    billingInterval: row.billing_interval,
    price: {
      currency: row.currency_code,
      amountCents: row.amount_cents,
    },
    educationOnly: row.education_only,
    entitlements:
      membershipEntitlementRows.get(row.id) ??
      ({
        includedServiceSlugs: [],
        educationOfferSlugs: [],
        monthlyServiceCredits: [],
        memberDiscountPercent: 0,
      } satisfies MembershipEntitlement),
  }));

  const providerCompPlans: ProviderCompPlan[] = providerCompPlansResult.rows.map((row) => ({
    providerSlug: row.provider_slug,
    locationSlug: row.location_slug,
    serviceSlug: row.service_slug ?? undefined,
    commissionPercent: Number(row.commission_percent),
    appliesToRevenueStream: row.applies_to_revenue_stream,
  }));

  const locationScheduleRows = new Map<string, Array<{ day_of_week: number; start_minute: number; end_minute: number }>>();
  for (const row of locationSchedulesResult.rows) {
    locationScheduleRows.set(row.location_slug, [
      ...(locationScheduleRows.get(row.location_slug) ?? []),
      row,
    ]);
  }
  const locationSchedules: LocationOperatingSchedule[] = locations.map((location) => ({
    locationSlug: location.slug,
    availability: toRecurringWindows(locationScheduleRows.get(location.slug) ?? []),
  }));

  const providerServiceRows = new Map<string, string[]>();
  for (const row of providerServicesResult.rows) {
    providerServiceRows.set(row.assignment_id, [
      ...(providerServiceRows.get(row.assignment_id) ?? []),
      row.service_slug,
    ]);
  }
  const providerScheduleRows = new Map<string, Array<{ day_of_week: number; start_minute: number; end_minute: number }>>();
  for (const row of providerSchedulesResult.rows) {
    const key = buildScopedKey(row.location_slug, row.provider_slug);
    providerScheduleRows.set(key, [...(providerScheduleRows.get(key) ?? []), row]);
  }
  const providerExceptionRows = new Map<string, Array<{ startAt: string; endAt: string }>>();
  for (const row of providerExceptionsResult.rows) {
    const key = buildScopedKey(row.location_slug, row.provider_slug);
    providerExceptionRows.set(key, [
      ...(providerExceptionRows.get(key) ?? []),
      { startAt: row.starts_at, endAt: row.ends_at },
    ]);
  }
  const providers: ProviderResource[] = providersResult.rows.map((row) => {
    const key = buildScopedKey(row.location_slug, row.provider_slug);
    return {
      slug: row.provider_slug,
      name: row.provider_name,
      email: row.provider_email ?? undefined,
      locationSlug: row.location_slug,
      serviceSlugs: providerServiceRows.get(row.assignment_id) ?? [],
      availability: toRecurringWindows(providerScheduleRows.get(key) ?? []),
      blockedWindows: providerExceptionRows.get(key) ?? [],
    };
  });

  const machineCapabilityRows = new Map<string, string[]>();
  for (const row of machineCapabilitiesResult.rows) {
    const key = buildScopedKey(row.location_slug, row.machine_slug);
    machineCapabilityRows.set(key, [...(machineCapabilityRows.get(key) ?? []), row.capability_key]);
  }
  const machineScheduleRows = new Map<string, Array<{ day_of_week: number; start_minute: number; end_minute: number }>>();
  for (const row of machineSchedulesResult.rows) {
    const key = buildScopedKey(row.location_slug, row.machine_slug);
    machineScheduleRows.set(key, [...(machineScheduleRows.get(key) ?? []), row]);
  }
  const machineWindowRows = new Map<string, Array<{ startAt: string; endAt: string }>>();
  for (const row of machineWindowsResult.rows) {
    const key = buildScopedKey(row.location_slug, row.resource_slug);
    machineWindowRows.set(key, [
      ...(machineWindowRows.get(key) ?? []),
      { startAt: row.starts_at, endAt: row.ends_at },
    ]);
  }
  const machines: MachineResource[] = machinesResult.rows.map((row) => {
    const key = buildScopedKey(row.location_slug, row.machine_slug);
    return {
      slug: row.machine_slug,
      name: row.machine_name,
      locationSlug: row.location_slug,
      capabilitySlugs: machineCapabilityRows.get(key) ?? [],
      availability: toRecurringWindows(machineScheduleRows.get(key) ?? []),
      blockedWindows: machineWindowRows.get(key) ?? [],
    };
  });

  const roomCapabilityRows = new Map<string, string[]>();
  for (const row of roomCapabilitiesResult.rows) {
    const key = buildScopedKey(row.location_slug, row.room_slug);
    roomCapabilityRows.set(key, [...(roomCapabilityRows.get(key) ?? []), row.capability_key]);
  }
  const roomScheduleRows = new Map<string, Array<{ day_of_week: number; start_minute: number; end_minute: number }>>();
  for (const row of roomSchedulesResult.rows) {
    const key = buildScopedKey(row.location_slug, row.room_slug);
    roomScheduleRows.set(key, [...(roomScheduleRows.get(key) ?? []), row]);
  }
  const roomWindowRows = new Map<string, Array<{ startAt: string; endAt: string }>>();
  for (const row of roomWindowsResult.rows) {
    const key = buildScopedKey(row.location_slug, row.resource_slug);
    roomWindowRows.set(key, [
      ...(roomWindowRows.get(key) ?? []),
      { startAt: row.starts_at, endAt: row.ends_at },
    ]);
  }
  const rooms: RoomResource[] = roomsResult.rows.map((row) => {
    const key = buildScopedKey(row.location_slug, row.room_slug);
    return {
      slug: row.room_slug,
      name: row.room_name,
      locationSlug: row.location_slug,
      capabilitySlugs: roomCapabilityRows.get(key) ?? [],
      availability: toRecurringWindows(roomScheduleRows.get(key) ?? []),
      blockedWindows: roomWindowRows.get(key) ?? [],
    };
  });

  return {
    tenantContext: {
      brandSlug: brand.slug,
      brandName: brand.name,
      primaryDomain: brand.primary_domain,
      environment: env.DAYSI_ENV,
      organizations,
      locations,
    },
    clinicData: {
      ...bootstrap,
      catalog: {
        ...bootstrap.catalog,
        services: services.length > 0 ? services : bootstrap.catalog.services,
        products: products.length > 0 ? products : bootstrap.catalog.products,
        educationOffers:
          educationOffers.length > 0 ? educationOffers : bootstrap.catalog.educationOffers,
        servicePackages:
          servicePackages.length > 0 ? servicePackages : bootstrap.catalog.servicePackages,
      },
      coupons: coupons.length > 0 ? coupons : bootstrap.coupons,
      membershipPlans: membershipPlans.length > 0 ? membershipPlans : bootstrap.membershipPlans,
      providerCompPlans:
        providerCompPlans.length > 0 ? providerCompPlans : bootstrap.providerCompPlans,
      locationSchedules: locationSchedules.length > 0 ? locationSchedules : bootstrap.locationSchedules,
      locationSchedule:
        locationSchedules.find((entry) => entry.locationSlug === env.DAYSI_DEFAULT_LOCATION_SLUG) ??
        bootstrap.locationSchedule,
      providers: providers.length > 0 ? providers : bootstrap.providers,
      machines: machines.length > 0 ? machines : bootstrap.machines,
      rooms: rooms.length > 0 ? rooms : bootstrap.rooms,
    },
  };
};

export const createPostgresClinicDefinitionRepository = (
  db: Queryable,
): ClinicDefinitionRepository => {
  const cache = new Map<string, Snapshot>();

  return {
    hydrate: async (env) => {
      cache.set(buildCacheKey(env), await buildSnapshot(db, env));
    },
    getTenantContext: (env) => {
      const snapshot = cache.get(buildCacheKey(env));
      if (!snapshot) {
        throw new Error(
          `Postgres clinic definitions have not been hydrated for ${env.DAYSI_BRAND_SLUG}.`,
        );
      }

      return snapshot.tenantContext;
    },
    getClinicData: (env) => {
      const snapshot = cache.get(buildCacheKey(env));
      if (!snapshot) {
        throw new Error(
          `Postgres clinic definitions have not been hydrated for ${env.DAYSI_BRAND_SLUG}.`,
        );
      }

      return snapshot.clinicData;
    },
    reset: () => {
      cache.clear();
    },
  };
};
