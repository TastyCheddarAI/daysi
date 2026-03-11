export type LocationFeature = "education" | "memberships" | "referrals" | "skinAnalysis";
export type OrganizationOperatingMode = "corporate" | "franchise";

export interface TenantOrganization {
  id: string;
  slug: string;
  name: string;
  operatingMode: OrganizationOperatingMode;
}

export interface TenantLocation {
  id: string;
  slug: string;
  name: string;
  organizationId: string;
  enabledModules: LocationFeature[];
}

export interface TenantContext {
  brandSlug: string;
  brandName: string;
  primaryDomain: string;
  environment: string;
  organizations: TenantOrganization[];
  locations: TenantLocation[];
}

export const getOrganizationById = (
  context: TenantContext,
  organizationId: string,
): TenantOrganization | undefined =>
  context.organizations.find((organization) => organization.id === organizationId);

export const getOrganizationBySlug = (
  context: TenantContext,
  organizationSlug: string,
): TenantOrganization | undefined =>
  context.organizations.find((organization) => organization.slug === organizationSlug);

export const getLocationBySlug = (
  context: TenantContext,
  locationSlug: string,
): TenantLocation | undefined =>
  context.locations.find((location) => location.slug === locationSlug);

export const listOrganizationsForLocationScopes = (
  context: TenantContext,
  locationScopes: string[],
): TenantOrganization[] => {
  const organizationIds = new Set(
    context.locations
      .filter((location) => locationScopes.includes(location.slug))
      .map((location) => location.organizationId),
  );

  return context.organizations.filter((organization) => organizationIds.has(organization.id));
};

export const isFeatureEnabled = (
  location: TenantLocation,
  feature: LocationFeature,
): boolean => location.enabledModules.includes(feature);
