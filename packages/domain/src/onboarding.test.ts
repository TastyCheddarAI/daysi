import { describe, expect, it } from "vitest";

import { buildLocationOnboardingOverview } from "./onboarding";

describe("onboarding", () => {
  it("marks incomplete locations as setup required and failed imports as attention required", () => {
    const tenant = {
      brandSlug: "daysi",
      brandName: "Daysi",
      primaryDomain: "daysi.ca",
      environment: "test",
      organizations: [
        {
          id: "org_daysi",
          slug: "daysi-corporate",
          name: "Daysi Corporate",
          operatingMode: "corporate" as const,
        },
      ],
      locations: [
        {
          id: "loc_daysi_flagship",
          slug: "daysi-flagship",
          name: "Daysi Flagship",
          organizationId: "org_daysi",
          enabledModules: ["memberships", "education"] as const,
        },
      ],
    };

    const setupRequired = buildLocationOnboardingOverview({
      tenant: {
        ...tenant,
        locations: tenant.locations.map((location) => ({
          ...location,
          enabledModules: [...location.enabledModules],
        })),
      },
      locationSlug: "daysi-flagship",
      services: [],
      providers: [],
      machines: [],
      rooms: [],
      membershipPlans: [],
      importJobs: [],
    });

    expect(setupRequired.status).toBe("setup_required");
    expect(
      setupRequired.checklist.find((check) => check.key === "services")?.isComplete,
    ).toBe(false);

    const attentionRequired = buildLocationOnboardingOverview({
      tenant: {
        ...tenant,
        locations: tenant.locations.map((location) => ({
          ...location,
          enabledModules: [...location.enabledModules],
        })),
      },
      locationSlug: "daysi-flagship",
      locationSchedule: {
        locationSlug: "daysi-flagship",
        availability: [
          {
            daysOfWeek: [1],
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      },
      services: [
        {
          id: "svc_1",
          slug: "laser-hair-removal",
          variantSlug: "laser-hair-removal-full-body-60",
          categorySlug: "laser",
          locationSlug: "daysi-flagship",
          name: "Laser Hair Removal",
          shortDescription: "Service",
          description: "Service",
          durationMinutes: 60,
          bookable: true,
          price: {
            currency: "CAD",
            retailAmountCents: 29900,
            memberAmountCents: 25900,
            membershipRequired: false,
          },
          bookingPolicy: {
            cancellationWindowHours: 24,
            bufferMinutes: 10,
            requiresDeposit: false,
          },
          machineCapabilities: ["laser"],
          roomCapabilities: ["treatment-room"],
          featureTags: ["core"],
        },
      ],
      providers: [
        {
          slug: "ava-chen",
          name: "Ava Chen",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["laser-hair-removal"],
          availability: [
            {
              daysOfWeek: [1],
              startMinute: 9 * 60,
              endMinute: 17 * 60,
            },
          ],
          blockedWindows: [],
        },
      ],
      machines: [
        {
          slug: "laser-a",
          name: "Laser A",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["laser"],
          availability: [
            {
              daysOfWeek: [1],
              startMinute: 9 * 60,
              endMinute: 17 * 60,
            },
          ],
          blockedWindows: [],
        },
      ],
      rooms: [
        {
          slug: "treatment-suite-a",
          name: "Treatment Suite A",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["treatment-room"],
          availability: [
            {
              daysOfWeek: [1],
              startMinute: 9 * 60,
              endMinute: 17 * 60,
            },
          ],
          blockedWindows: [],
        },
      ],
      membershipPlans: [],
      importJobs: [
        {
          id: "ijob_1",
          locationSlug: "daysi-flagship",
          sourceSystem: "csv",
          entityType: "customers",
          status: "failed",
          metadata: {},
          counts: {
            totalRows: 1,
            processedRows: 0,
            failedRows: 1,
            skippedRows: 0,
            queuedRows: 0,
          },
          rows: [],
          createdAt: "2026-03-08T12:00:00.000Z",
          updatedAt: "2026-03-08T12:05:00.000Z",
          completedAt: "2026-03-08T12:05:00.000Z",
          errorMessage: "Import failed",
        },
      ],
    });

    expect(attentionRequired.status).toBe("attention_required");
    expect(attentionRequired.counts.failedImportJobCount).toBe(1);
    expect(attentionRequired.counts.roomCount).toBe(1);
    expect(
      attentionRequired.checklist.every((check) => (check.required ? check.isComplete : true)),
    ).toBe(true);
  });
});
