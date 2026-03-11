import { describe, expect, it } from "vitest";

import { loadAppEnv } from "../config";
import { createPostgresClinicDefinitionRepository } from "./postgres-clinic-definition-repository";

const env = loadAppEnv({
  ...process.env,
  DAYSI_BRAND_SLUG: "daysi",
  DAYSI_CLINIC_DEFINITION_REPOSITORY: "postgres",
  DAYSI_DEFAULT_LOCATION_SLUG: "daysi-flagship",
  DAYSI_DEFAULT_LOCATION_NAME: "Daysi Flagship",
  DATABASE_URL: "postgres://daysi:test@localhost:5432/daysi",
});

const queryResult = <T>(rows: T[]) => ({
  rowCount: rows.length,
  rows,
});

describe("postgres clinic definition repository", () => {
  it("hydrates commercial and operational clinic definitions from canonical tables", async () => {
    const db = {
      query: (async <T>(
        queryText: string | { text?: string },
      ): Promise<{ rowCount: number; rows: T[] }> => {
        const sql =
          typeof queryText === "string" ? queryText : (queryText.text ?? "");

        if (sql.includes("from brand")) {
          return queryResult([
            {
              id: "brand_daysi",
              slug: "daysi",
              name: "Daysi",
              primary_domain: "daysi.ca",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from organization")) {
          return queryResult([
            {
              id: "org_daysi",
              slug: "daysi-corporate",
              name: "Daysi Corporate",
              operating_mode: "corporate",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from location as l") && sql.includes("location_feature_flag")) {
          return queryResult([
            {
              id: "loc_daysi_flagship",
              slug: "daysi-flagship",
              name: "Daysi Flagship",
              organization_id: "org_daysi",
              enabled_modules: ["education", "memberships", "referrals"],
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from service_location_offer as slo")) {
          return queryResult([
            {
              id: "svc_lhr",
              location_slug: "daysi-flagship",
              slug: "laser-hair-removal",
              variant_slug: "laser-hair-removal-full-body-60",
              category_slug: "laser",
              name: "Laser Hair Removal",
              short_description: "Flagship service.",
              description: "Canonical service record.",
              duration_minutes: 60,
              is_bookable: true,
              currency_code: "CAD",
              retail_price_cents: 29900,
              member_price_cents: 24900,
              membership_required: false,
              cancellation_window_hours: 24,
              buffer_minutes: 15,
              requires_deposit: false,
              feature_tags: ["flagship", "laser"],
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from machine_service_rule")) {
          return queryResult([
            {
              variant_slug: "laser-hair-removal-full-body-60",
              capability_key: "laser-hair-removal",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from service_room_rule")) {
          return queryResult([]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from product_location_offer")) {
          return queryResult([
            {
              id: "prd_aftercare",
              location_slug: "daysi-flagship",
              slug: "aftercare-kit",
              name: "Aftercare Kit",
              short_description: "Retail product.",
              currency_code: "CAD",
              price_cents: 6900,
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from education_offer as eo")) {
          return queryResult([
            {
              id: "edu_signature_method",
              location_slug: "daysi-flagship",
              slug: "signature-laser-method",
              title: "Daysi Signature Laser Method",
              short_description: "Education offer.",
              status: "published",
              currency_code: "CAD",
              price_cents: 49900,
              is_free: false,
              config: {
                membershipEligible: true,
                staffGrantEnabled: true,
              },
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from education_offer_item as eoi")) {
          return queryResult([
            {
              offer_id: "edu_signature_method",
              module_slug: "laser-foundations",
            },
            {
              offer_id: "edu_signature_method",
              module_slug: "consulting-script",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from service_package_offer as spo")) {
          return queryResult([
            {
              id: "spkg_lhr_series_3",
              location_slug: "daysi-flagship",
              slug: "laser-hair-removal-series-3",
              name: "Laser Hair Removal Series of 3",
              short_description: "Package offer.",
              status: "published",
              currency_code: "CAD",
              price_amount_cents: 79900,
              feature_tags: ["prepaid", "laser"],
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from service_package_credit as spc")) {
          return queryResult([
            {
              offer_id: "spkg_lhr_series_3",
              service_slug: "laser-hair-removal",
              quantity: 3,
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from coupon as c")) {
          return queryResult([
            {
              id: "cpn_welcome10",
              location_slug: "daysi-flagship",
              code: "WELCOME10",
              name: "Welcome 10",
              is_active: true,
              stackable: false,
              discount_type: "percent",
              discount_value: "10",
              applies_to_revenue_stream: "services",
              config: {
                appliesToKinds: ["booking", "servicePackage"],
                appliesToRevenueStreams: ["services", "packages"],
              },
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from membership_plan as mp")) {
          return queryResult([
            {
              id: "mplan_glow",
              location_slug: "daysi-flagship",
              slug: "glow-membership",
              name: "Glow Membership",
              description: "Membership plan.",
              billing_interval: "month",
              education_only: false,
              currency_code: "CAD",
              amount_cents: 12900,
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from membership_entitlement as me")) {
          return queryResult([
            {
              plan_id: "mplan_glow",
              entitlement_type: "service_credit",
              service_slug: "laser-hair-removal",
              education_offer_slug: null,
              quantity: 1,
              discount_percent: null,
            },
            {
              plan_id: "mplan_glow",
              entitlement_type: "member_discount",
              service_slug: null,
              education_offer_slug: null,
              quantity: null,
              discount_percent: "15",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from provider_comp_plan as pcp")) {
          return queryResult([
            {
              provider_slug: "ava-chen",
              location_slug: "daysi-flagship",
              service_slug: "laser-hair-removal",
              commission_percent: "42",
              applies_to_revenue_stream: "services",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from location_schedule as ls")) {
          return queryResult([
            {
              location_slug: "daysi-flagship",
              day_of_week: 1,
              start_minute: 540,
              end_minute: 1020,
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from provider_role_assignment as pra")) {
          return queryResult([
            {
              assignment_id: "pra_ava_flagship",
              provider_slug: "ava-chen",
              provider_name: "Ava Chen",
              provider_email: "ava.chen@daysi.ca",
              location_slug: "daysi-flagship",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from provider_service_assignment as psa")) {
          return queryResult([
            {
              assignment_id: "pra_ava_flagship",
              service_slug: "laser-hair-removal",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from provider_schedule_template as pst")) {
          return queryResult([
            {
              provider_slug: "ava-chen",
              location_slug: "daysi-flagship",
              day_of_week: 1,
              start_minute: 540,
              end_minute: 1020,
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from provider_schedule_exception as pse")) {
          return queryResult([
            {
              provider_slug: "ava-chen",
              location_slug: "daysi-flagship",
              starts_at: "2026-03-11T13:00:00.000Z",
              ends_at: "2026-03-11T14:00:00.000Z",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from location_machine_inventory as lmi") && sql.includes("m.display_name as machine_name")) {
          return queryResult([
            {
              machine_slug: "gentlemax-pro-a",
              machine_name: "GentleMax Pro A",
              location_slug: "daysi-flagship",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from location_machine_inventory as lmi") && sql.includes("mc.capability_key")) {
          return queryResult([
            {
              machine_slug: "gentlemax-pro-a",
              location_slug: "daysi-flagship",
              capability_key: "laser-hair-removal",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from machine_schedule as ms")) {
          return queryResult([
            {
              machine_slug: "gentlemax-pro-a",
              location_slug: "daysi-flagship",
              day_of_week: 1,
              start_minute: 540,
              end_minute: 1080,
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from machine_booking_window as mbw")) {
          return queryResult([
            {
              resource_slug: "gentlemax-pro-a",
              location_slug: "daysi-flagship",
              starts_at: "2026-03-12T13:00:00.000Z",
              ends_at: "2026-03-12T14:00:00.000Z",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from room as r") && sql.includes("r.display_name as room_name")) {
          return queryResult([
            {
              room_slug: "treatment-suite-a",
              room_name: "Treatment Suite A",
              location_slug: "daysi-flagship",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from room_capability as rc")) {
          return queryResult([
            {
              room_slug: "treatment-suite-a",
              location_slug: "daysi-flagship",
              capability_key: "treatment-room",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from room_schedule as rs")) {
          return queryResult([
            {
              room_slug: "treatment-suite-a",
              location_slug: "daysi-flagship",
              day_of_week: 1,
              start_minute: 540,
              end_minute: 1080,
            },
          ]) as { rowCount: number; rows: T[] };
        }

        if (sql.includes("from room_booking_window as rbw")) {
          return queryResult([
            {
              resource_slug: "treatment-suite-a",
              location_slug: "daysi-flagship",
              starts_at: "2026-03-12T15:00:00.000Z",
              ends_at: "2026-03-12T16:00:00.000Z",
            },
          ]) as { rowCount: number; rows: T[] };
        }

        throw new Error(`Unhandled query: ${sql}`);
      }) as unknown as Parameters<typeof createPostgresClinicDefinitionRepository>[0]["query"],
    };

    const repository = createPostgresClinicDefinitionRepository(
      db as Parameters<typeof createPostgresClinicDefinitionRepository>[0],
    );
    await repository.hydrate?.(env);

    const tenant = repository.getTenantContext(env);
    const clinicData = repository.getClinicData(env);

    expect(tenant.brandSlug).toBe("daysi");
    expect(tenant.locations[0]?.enabledModules).toContain("education");
    expect(clinicData.catalog.educationOffers[0]?.membershipEligible).toBe(true);
    expect(clinicData.catalog.servicePackages[0]?.serviceCredits[0]?.quantity).toBe(3);
    expect(clinicData.coupons[0]?.appliesToRevenueStreams).toContain("packages");
    expect(clinicData.membershipPlans[0]?.entitlements.memberDiscountPercent).toBe(15);
    expect(clinicData.providerCompPlans[0]?.commissionPercent).toBe(42);
    expect(clinicData.providers[0]?.serviceSlugs).toContain("laser-hair-removal");
    expect(clinicData.machines[0]?.capabilitySlugs).toContain("laser-hair-removal");
    expect(clinicData.rooms[0]?.capabilitySlugs).toContain("treatment-room");
  });
});
