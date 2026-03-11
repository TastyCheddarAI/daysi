import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadAppEnv } from "../config";

const initializeClinicDefinitionRepository = vi.fn(async () => {});
const getPostgresPool = vi.fn();

vi.mock("./clinic-definition-repository", () => ({
  initializeClinicDefinitionRepository,
}));

vi.mock("./postgres-pool", () => ({
  getPostgresPool,
}));

const env = loadAppEnv({
  ...process.env,
  DAYSI_BRAND_SLUG: "daysi",
  DAYSI_CLINIC_DEFINITION_REPOSITORY: "postgres",
  DATABASE_URL: "postgres://daysi:test@localhost:5432/daysi",
});

const queryResult = <T>(rows: T[]) => ({
  rowCount: rows.length,
  rows,
});

const getSqlText = (queryText: string | { text?: string }): string =>
  typeof queryText === "string" ? queryText : (queryText.text ?? "");

describe("canonical definition writes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists canonical location schedules and feature flags", async () => {
    const client = {
      query: vi.fn(async (queryText: string | { text?: string }) => {
        const sql = getSqlText(queryText);

        if (sql === "begin" || sql === "commit" || sql === "rollback") {
          return queryResult([]);
        }

        if (sql.includes("from brand")) {
          return queryResult([{ id: "brand_daysi" }]);
        }

        if (sql.includes("from organization")) {
          return queryResult([{ id: "org_corporate" }]);
        }

        if (sql.includes("insert into location")) {
          return queryResult([{ id: "loc_flagship" }]);
        }

        return queryResult([]);
      }),
      release: vi.fn(),
    };
    getPostgresPool.mockReturnValue({
      connect: vi.fn(async () => client),
    });

    const { persistCanonicalLocation } = await import("./canonical-definition-writes");

    await persistCanonicalLocation({
      env,
      location: {
        id: "loc_runtime",
        slug: "daysi-flagship",
        name: "Daysi Flagship",
        organizationId: "org_corporate",
        enabledModules: ["education", "memberships"],
      },
      operatingSchedule: {
        locationSlug: "daysi-flagship",
        availability: [
          {
            daysOfWeek: [1],
            startMinute: 540,
            endMinute: 1020,
          },
          {
            daysOfWeek: [2],
            startMinute: 540,
            endMinute: 1020,
          },
        ],
      },
    });

    const sqlCalls = client.query.mock.calls.map(([queryText]) => getSqlText(queryText));
    expect(sqlCalls.some((sql) => sql.includes("insert into location"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("delete from location_feature_flag"))).toBe(true);
    expect(sqlCalls.filter((sql) => sql.includes("insert into location_feature_flag")).length).toBe(4);
    expect(sqlCalls.some((sql) => sql.includes("delete from location_schedule"))).toBe(true);
    expect(sqlCalls.filter((sql) => sql.includes("insert into location_schedule")).length).toBe(2);
    expect(initializeClinicDefinitionRepository).toHaveBeenCalledWith(env);
  });

  it("persists canonical providers through app_user identity linkage", async () => {
    const client = {
      query: vi.fn(async (queryText: string | { text?: string }, params?: unknown[]) => {
        const sql = getSqlText(queryText);

        if (sql === "begin" || sql === "commit" || sql === "rollback") {
          return queryResult([]);
        }

        if (sql.includes("from brand")) {
          return queryResult([{ id: "brand_daysi" }]);
        }

        if (sql.includes("from location")) {
          return queryResult([{ id: "loc_flagship", organization_id: "org_corporate" }]);
        }

        if (sql.includes("from app_user")) {
          return queryResult([]);
        }

        if (sql.includes("insert into app_user")) {
          return queryResult([{ id: "user_provider" }]);
        }

        if (sql.includes("insert into provider (")) {
          expect(params?.[0]).toBe("user_provider");
          return queryResult([{ id: "provider_ava" }]);
        }

        if (sql.includes("insert into provider_role_assignment")) {
          return queryResult([{ id: "pra_ava_flagship" }]);
        }

        if (sql.includes("from service as s")) {
          return queryResult([{ id: "svc_lhr", variant_id: "svc_variant_lhr" }]);
        }

        return queryResult([]);
      }),
      release: vi.fn(),
    };
    getPostgresPool.mockReturnValue({
      connect: vi.fn(async () => client),
    });

    const { persistCanonicalProvider } = await import("./canonical-definition-writes");

    await persistCanonicalProvider(env, {
      slug: "ava-chen",
      name: "Ava Chen",
      email: "ava.chen@daysi.ca",
      locationSlug: "daysi-flagship",
      serviceSlugs: ["laser-hair-removal"],
      availability: [
        {
          daysOfWeek: [1],
          startMinute: 540,
          endMinute: 1020,
        },
      ],
      blockedWindows: [
        {
          startAt: "2026-03-12T15:00:00.000Z",
          endAt: "2026-03-12T16:00:00.000Z",
        },
      ],
    });

    const sqlCalls = client.query.mock.calls.map(([queryText]) => getSqlText(queryText));
    expect(sqlCalls.some((sql) => sql.includes("insert into app_user"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("insert into provider_role_assignment"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("insert into provider_schedule_template"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("insert into provider_schedule_exception"))).toBe(true);
    expect(initializeClinicDefinitionRepository).toHaveBeenCalledWith(env);
  });

  it("stores included service metadata with canonical membership entitlements", async () => {
    const client = {
      query: vi.fn(async (queryText: string | { text?: string }, params?: unknown[]) => {
        const sql = getSqlText(queryText);

        if (sql === "begin" || sql === "commit" || sql === "rollback") {
          return queryResult([]);
        }

        if (sql.includes("from brand")) {
          return queryResult([{ id: "brand_daysi" }]);
        }

        if (sql.includes("from location")) {
          return queryResult([{ id: "loc_flagship", organization_id: "org_corporate" }]);
        }

        if (sql.includes("insert into membership_plan")) {
          return queryResult([{ id: "mplan_glow" }]);
        }

        if (sql.includes("from service as s")) {
          return queryResult([{ id: "svc_lhr", variant_id: "svc_variant_lhr" }]);
        }

        if (sql.includes("from education_offer")) {
          return queryResult([{ id: "edu_laser_mastery" }]);
        }

        if (sql.includes("insert into membership_entitlement")) {
          const config = params?.[params.length - 1];
          if (typeof config === "string") {
            expect(JSON.parse(config)).toEqual({
              includedServiceSlugs: ["laser-hair-removal"],
            });
          }
          return queryResult([]);
        }

        return queryResult([]);
      }),
      release: vi.fn(),
    };
    getPostgresPool.mockReturnValue({
      connect: vi.fn(async () => client),
    });

    const { persistCanonicalMembershipPlan } = await import("./canonical-definition-writes");

    await persistCanonicalMembershipPlan(env, {
      id: "mplan_runtime",
      slug: "glow-membership",
      locationSlug: "daysi-flagship",
      name: "Glow Membership",
      description: "Monthly glow plan",
      billingInterval: "month",
      price: {
        currency: "CAD",
        amountCents: 12900,
      },
      educationOnly: false,
      entitlements: {
        includedServiceSlugs: ["laser-hair-removal"],
        educationOfferSlugs: ["laser-mastery"],
        monthlyServiceCredits: [
          {
            serviceSlug: "laser-hair-removal",
            quantity: 1,
          },
        ],
        memberDiscountPercent: 15,
      },
    });

    const sqlCalls = client.query.mock.calls.map(([queryText]) => getSqlText(queryText));
    expect(sqlCalls.some((sql) => sql.includes("insert into membership_plan"))).toBe(true);
    expect(sqlCalls.filter((sql) => sql.includes("insert into membership_entitlement")).length).toBe(3);
    expect(initializeClinicDefinitionRepository).toHaveBeenCalledWith(env);
  });
});
