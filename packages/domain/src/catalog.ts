import type { ServicePackageOffer } from "./packages";

export interface CatalogPriceSummary {
  currency: string;
  retailAmountCents: number;
  memberAmountCents?: number;
  membershipRequired: boolean;
}

export interface CatalogBookingPolicy {
  cancellationWindowHours: number;
  bufferMinutes: number;
  requiresDeposit: boolean;
}

export interface CatalogService {
  id: string;
  slug: string;
  variantSlug: string;
  categorySlug: string;
  locationSlug: string;
  name: string;
  shortDescription: string;
  description: string;
  durationMinutes: number;
  bookable: boolean;
  price: CatalogPriceSummary;
  bookingPolicy: CatalogBookingPolicy;
  machineCapabilities: string[];
  roomCapabilities?: string[];
  featureTags: string[];
}

export interface CatalogProduct {
  id: string;
  slug: string;
  locationSlug: string;
  name: string;
  shortDescription: string;
  price: {
    currency: string;
    amountCents: number;
  };
}

export interface EducationOffer {
  id: string;
  slug: string;
  locationSlug: string;
  title: string;
  shortDescription: string;
  status: "draft" | "published";
  moduleSlugs: string[];
  membershipEligible: boolean;
  staffGrantEnabled: boolean;
  requiresEntitlement: true;
  price: {
    currency: string;
    amountCents: number;
    isFree: boolean;
  };
}

export interface CatalogSnapshot {
  services: CatalogService[];
  products: CatalogProduct[];
  educationOffers: EducationOffer[];
  servicePackages: ServicePackageOffer[];
}

export const listServicesForLocation = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
): CatalogService[] =>
  snapshot.services.filter(
    (service) => service.locationSlug === locationSlug && service.bookable,
  );

export const getServiceBySlug = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
  serviceSlug: string,
): CatalogService | undefined =>
  snapshot.services.find(
    (service) => service.locationSlug === locationSlug && service.slug === serviceSlug,
  );

export const listProductsForLocation = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
): CatalogProduct[] =>
  snapshot.products.filter((product) => product.locationSlug === locationSlug);

export const listEducationOffersForLocation = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
): EducationOffer[] =>
  snapshot.educationOffers.filter(
    (offer) => offer.locationSlug === locationSlug && offer.status === "published",
  );

export const listAdminEducationOffersForLocation = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
): EducationOffer[] =>
  snapshot.educationOffers.filter((offer) => offer.locationSlug === locationSlug);

export const getEducationOfferBySlug = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
  offerSlug: string,
  options: { includeDraft?: boolean } = {},
): EducationOffer | undefined =>
  snapshot.educationOffers.find(
    (offer) =>
      offer.locationSlug === locationSlug &&
      offer.slug === offerSlug &&
      (options.includeDraft || offer.status === "published"),
  );

export const listServicePackageOffersForLocation = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
): ServicePackageOffer[] =>
  snapshot.servicePackages.filter(
    (offer) => offer.locationSlug === locationSlug && offer.status === "published",
  );

export const listAdminServicePackageOffersForLocation = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
): ServicePackageOffer[] =>
  snapshot.servicePackages.filter((offer) => offer.locationSlug === locationSlug);

export const getServicePackageOfferBySlug = (
  snapshot: CatalogSnapshot,
  locationSlug: string,
  packageSlug: string,
  options: { includeDraft?: boolean } = {},
): ServicePackageOffer | undefined =>
  snapshot.servicePackages.find(
    (offer) =>
      offer.locationSlug === locationSlug &&
      offer.slug === packageSlug &&
      (options.includeDraft || offer.status === "published"),
  );
