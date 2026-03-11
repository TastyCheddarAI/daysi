import { describe, expect, it } from "vitest";

import {
  buildLocationFeatureFlagEntries,
  buildLocationFeatureFlags,
  createTenantSetting,
  setLocationFeatureFlag,
  updateTenantSetting,
} from "./tenant-settings";

describe("tenant settings", () => {
  it("creates settings, updates values, and toggles location feature flags", () => {
    const location = {
      id: "loc_daysi_flagship",
      slug: "daysi-flagship",
      name: "Daysi Flagship",
      organizationId: "org_daysi",
      enabledModules: ["education", "memberships"] as const,
    };

    const created = createTenantSetting({
      locationSlug: "daysi-flagship",
      key: "plugin.supportPortal",
      value: true,
      updatedByUserId: "usr_admin_1",
      now: "2026-03-08T15:00:00.000Z",
    });

    expect(created.valueType).toBe("boolean");

    const updated = updateTenantSetting({
      setting: created,
      value: "enabled",
      updatedByUserId: "usr_admin_2",
      now: "2026-03-08T15:05:00.000Z",
    });

    expect(updated.valueType).toBe("string");
    expect(updated.value).toBe("enabled");
    expect(updated.updatedByUserId).toBe("usr_admin_2");

    const jsonSetting = createTenantSetting({
      locationSlug: "daysi-flagship",
      key: "business.profile",
      value: {
        businessName: "Prairie Glow",
        city: "Niverville",
        province: "MB",
      },
      updatedByUserId: "usr_admin_2",
      now: "2026-03-08T15:06:00.000Z",
    });

    expect(jsonSetting.valueType).toBe("json");

    const nextLocation = setLocationFeatureFlag({
      location: {
        ...location,
        enabledModules: [...location.enabledModules],
      },
      feature: "skinAnalysis",
      enabled: true,
    });

    expect(buildLocationFeatureFlags(nextLocation)).toEqual({
      education: true,
      memberships: true,
      referrals: false,
      skinAnalysis: true,
    });

    expect(
      buildLocationFeatureFlagEntries({
        location: nextLocation,
        settings: [
          createTenantSetting({
            locationSlug: "daysi-flagship",
            key: "feature.skinAnalysis",
            value: true,
            updatedByUserId: "usr_admin_2",
            now: "2026-03-08T15:10:00.000Z",
          }),
        ],
      }).find((flag) => flag.feature === "skinAnalysis"),
    ).toEqual({
      feature: "skinAnalysis",
      settingKey: "feature.skinAnalysis",
      enabled: true,
      updatedAt: "2026-03-08T15:10:00.000Z",
      updatedByUserId: "usr_admin_2",
    });
  });
});
