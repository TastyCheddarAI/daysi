import { beforeEach, describe, expect, it } from "vitest";

import {
  addProviderScheduleException,
  getRuntimeClinicData,
  getRuntimeTenantContext,
  resetRuntimeClinicData,
  setMachineScheduleTemplate,
  upsertCatalogService,
  upsertTenantLocation,
} from "./clinic-runtime";
import { loadAppEnv } from "./config";
import { setClinicDefinitionRepository } from "./persistence/clinic-definition-repository";

const env = loadAppEnv({
  ...process.env,
  DAYSI_DEFAULT_LOCATION_SLUG: "daysi-flagship",
  DAYSI_DEFAULT_LOCATION_NAME: "Daysi Flagship",
});

beforeEach(() => {
  resetRuntimeClinicData();
});

describe("clinic runtime", () => {
  it("merges runtime tenant and catalog overrides over bootstrap data", () => {
    upsertTenantLocation({
      id: "loc_daysi_north",
      slug: "daysi-north",
      name: "Daysi North",
      organizationId: "org_daysi",
      enabledModules: ["memberships"],
    });

    upsertCatalogService({
      id: "svc_daysi_north_consult",
      slug: "consultation",
      variantSlug: "consultation-30",
      categorySlug: "consultation",
      locationSlug: "daysi-north",
      name: "Consultation",
      shortDescription: "North location consultation.",
      description: "A runtime-added consultation service for a new location.",
      durationMinutes: 30,
      bookable: true,
      price: {
        currency: "CAD",
        retailAmountCents: 5900,
        memberAmountCents: 4900,
        membershipRequired: false,
      },
      bookingPolicy: {
        cancellationWindowHours: 24,
        bufferMinutes: 5,
        requiresDeposit: false,
      },
      machineCapabilities: [],
      featureTags: ["consultation"],
    });

    const tenant = getRuntimeTenantContext(env);
    const clinicData = getRuntimeClinicData(env);

    expect(tenant.locations.some((location) => location.slug === "daysi-north")).toBe(true);
    expect(
      clinicData.catalog.services.some(
        (service) =>
          service.locationSlug === "daysi-north" && service.slug === "consultation",
      ),
    ).toBe(true);
  });

  it("applies runtime schedule overrides and clears them on reset", () => {
    setMachineScheduleTemplate("gentlemax-pro-a", [
      {
        daysOfWeek: [1],
        startMinute: 12 * 60,
        endMinute: 15 * 60,
      },
    ]);

    addProviderScheduleException("ava-chen", {
      startsAt: "2026-03-12T14:00:00.000Z",
      endsAt: "2026-03-12T15:00:00.000Z",
      kind: "blackout",
    });

    const overridden = getRuntimeClinicData(env);
    const machine = overridden.machines.find((entry) => entry.slug === "gentlemax-pro-a");
    const provider = overridden.providers.find((entry) => entry.slug === "ava-chen");

    expect(machine?.availability).toEqual([
      {
        daysOfWeek: [1],
        startMinute: 12 * 60,
        endMinute: 15 * 60,
      },
    ]);
    expect(provider?.blockedWindows).toContainEqual({
      startAt: "2026-03-12T14:00:00.000Z",
      endAt: "2026-03-12T15:00:00.000Z",
    });

    resetRuntimeClinicData();

    const resetData = getRuntimeClinicData(env);
    const resetMachine = resetData.machines.find((entry) => entry.slug === "gentlemax-pro-a");
    const resetProvider = resetData.providers.find((entry) => entry.slug === "ava-chen");

    expect(resetMachine?.availability).not.toEqual([
      {
        daysOfWeek: [1],
        startMinute: 12 * 60,
        endMinute: 15 * 60,
      },
    ]);
    expect(resetProvider?.blockedWindows).not.toContainEqual({
      startAt: "2026-03-12T14:00:00.000Z",
      endAt: "2026-03-12T15:00:00.000Z",
    });
  });

  it("can resolve tenant and clinic definitions from a replaceable base repository", () => {
    setClinicDefinitionRepository({
      getTenantContext: () => ({
        brandSlug: "daysi",
        brandName: "Daysi Labs",
        primaryDomain: "labs.daysi.ca",
        environment: "test",
        organizations: [
          {
            id: "org_labs",
            slug: "daysi-labs",
            name: "Daysi Labs",
            operatingMode: "corporate",
          },
        ],
        locations: [
          {
            id: "loc_labs",
            slug: "daysi-labs",
            name: "Daysi Labs",
            organizationId: "org_labs",
            enabledModules: ["education"],
          },
        ],
      }),
      getClinicData: () => ({
        catalog: {
          services: [
            {
              id: "svc_labs_consult",
              slug: "labs-consult",
              variantSlug: "labs-consult-45",
              categorySlug: "consultation",
              locationSlug: "daysi-labs",
              name: "Labs Consult",
              shortDescription: "Custom base repository service.",
              description: "Comes from a replaceable clinic-definition repository.",
              durationMinutes: 45,
              bookable: true,
              price: {
                currency: "CAD",
                retailAmountCents: 9900,
                memberAmountCents: 7900,
                membershipRequired: false,
              },
              bookingPolicy: {
                cancellationWindowHours: 24,
                bufferMinutes: 5,
                requiresDeposit: false,
              },
              machineCapabilities: [],
              featureTags: ["consultation"],
            },
          ],
          products: [],
          educationOffers: [],
          servicePackages: [],
        },
        coupons: [],
        membershipPlans: [],
        providerCompPlans: [],
        locationSchedules: [
          {
            locationSlug: "daysi-labs",
            availability: [
              {
                daysOfWeek: [1, 2, 3, 4, 5],
                startMinute: 9 * 60,
                endMinute: 17 * 60,
              },
            ],
          },
        ],
        locationSchedule: {
          locationSlug: "daysi-labs",
          availability: [
            {
              daysOfWeek: [1, 2, 3, 4, 5],
              startMinute: 9 * 60,
              endMinute: 17 * 60,
            },
          ],
        },
        providers: [],
        machines: [],
        rooms: [],
      }),
    });

    const tenant = getRuntimeTenantContext(env);
    const clinicData = getRuntimeClinicData(env);

    expect(tenant.brandName).toBe("Daysi Labs");
    expect(tenant.locations[0]?.slug).toBe("daysi-labs");
    expect(clinicData.catalog.services[0]?.slug).toBe("labs-consult");
  });

  it("does not layer runtime overrides over canonical Postgres definitions", () => {
    const postgresEnv = loadAppEnv({
      ...process.env,
      DAYSI_BRAND_SLUG: "daysi",
      DAYSI_CLINIC_DEFINITION_REPOSITORY: "postgres",
      DAYSI_DEFAULT_LOCATION_SLUG: "daysi-labs",
      DAYSI_DEFAULT_LOCATION_NAME: "Daysi Labs",
      DATABASE_URL: "postgres://daysi:test@localhost:5432/daysi",
    });

    setClinicDefinitionRepository({
      getTenantContext: () => ({
        brandSlug: "daysi",
        brandName: "Daysi Labs",
        primaryDomain: "labs.daysi.ca",
        environment: "test",
        organizations: [
          {
            id: "org_labs",
            slug: "daysi-labs",
            name: "Daysi Labs",
            operatingMode: "corporate",
          },
        ],
        locations: [
          {
            id: "loc_labs",
            slug: "daysi-labs",
            name: "Daysi Labs",
            organizationId: "org_labs",
            enabledModules: ["education"],
          },
        ],
      }),
      getClinicData: () => ({
        catalog: {
          services: [],
          products: [],
          educationOffers: [],
          servicePackages: [],
        },
        coupons: [],
        membershipPlans: [],
        providerCompPlans: [],
        locationSchedules: [],
        locationSchedule: {
          locationSlug: "daysi-labs",
          availability: [],
        },
        providers: [],
        machines: [],
        rooms: [],
      }),
    });

    upsertTenantLocation({
      id: "loc_runtime",
      slug: "daysi-runtime",
      name: "Daysi Runtime",
      organizationId: "org_runtime",
      enabledModules: ["memberships"],
    });

    const tenant = getRuntimeTenantContext(postgresEnv);

    expect(tenant.locations.map((location) => location.slug)).toEqual(["daysi-labs"]);
  });
});
