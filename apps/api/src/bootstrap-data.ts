import type { TenantContext } from "../../../packages/domain/src";

import type { AppEnv } from "./config";

export const buildBootstrapTenantContext = (env: AppEnv): TenantContext => ({
  brandSlug: env.DAYSI_BRAND_SLUG,
  brandName: env.DAYSI_PUBLIC_BRAND_NAME,
  primaryDomain: env.DAYSI_PUBLIC_PRIMARY_DOMAIN,
  environment: env.DAYSI_ENV,
  organizations: [
    {
      id: "org_daysi",
      slug: "daysi-corporate",
      name: "Daysi Corporate",
      operatingMode: "corporate",
    },
  ],
  locations: [
    {
      id: "loc_daysi_flagship",
      slug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      name: env.DAYSI_DEFAULT_LOCATION_NAME,
      organizationId: "org_daysi",
      enabledModules: ["education", "memberships", "referrals"],
    },
  ],
});
