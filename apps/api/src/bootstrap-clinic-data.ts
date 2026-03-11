import type {
  CatalogSnapshot,
  CouponDefinition,
  LocationOperatingSchedule,
  MachineResource,
  MembershipPlan,
  ProviderCompPlan,
  ProviderResource,
  RoomResource,
} from "../../../packages/domain/src";

import type { AppEnv } from "./config";

export interface BootstrapClinicData {
  catalog: CatalogSnapshot;
  coupons: CouponDefinition[];
  membershipPlans: MembershipPlan[];
  providerCompPlans: ProviderCompPlan[];
  locationSchedules: LocationOperatingSchedule[];
  locationSchedule: LocationOperatingSchedule;
  providers: ProviderResource[];
  machines: MachineResource[];
  rooms: RoomResource[];
}

export const buildBootstrapClinicData = (env: AppEnv): BootstrapClinicData => ({
  catalog: {
    services: [
      {
        id: "svc_lhr_full_body",
        slug: "laser-hair-removal",
        variantSlug: "laser-hair-removal-full-body-60",
        categorySlug: "laser",
        locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
        name: "Laser Hair Removal",
        shortDescription: "Full-body laser treatment with shared machine availability.",
        description:
          "High-conversion flagship treatment built around shared machine capacity, provider scheduling, and retail or member pricing.",
        durationMinutes: 60,
        bookable: true,
        price: {
          currency: "CAD",
          retailAmountCents: 29900,
          memberAmountCents: 24900,
          membershipRequired: false,
        },
        bookingPolicy: {
          cancellationWindowHours: 24,
          bufferMinutes: 15,
          requiresDeposit: false,
        },
        machineCapabilities: ["laser-hair-removal"],
        featureTags: ["flagship", "device-based", "retail-eligible", "member-eligible"],
      },
      {
        id: "svc_skin_rejuvenation",
        slug: "skin-rejuvenation",
        variantSlug: "skin-rejuvenation-photofacial-45",
        categorySlug: "skin",
        locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
        name: "Skin Rejuvenation",
        shortDescription: "Device-led photofacial treatment with operator and machine constraints.",
        description:
          "A skin-focused treatment designed to show how the platform handles separate machine capabilities, schedule overlap, and per-location pricing.",
        durationMinutes: 45,
        bookable: true,
        price: {
          currency: "CAD",
          retailAmountCents: 23900,
          memberAmountCents: 19900,
          membershipRequired: false,
        },
        bookingPolicy: {
          cancellationWindowHours: 24,
          bufferMinutes: 10,
          requiresDeposit: false,
        },
        machineCapabilities: ["skin-rejuvenation"],
        roomCapabilities: ["treatment-room"],
        featureTags: ["photofacial", "retail-eligible", "member-eligible"],
      },
    ],
    products: [
      {
        id: "prd_aftercare_kit",
        slug: "aftercare-kit",
        locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
        name: "Daysi Aftercare Kit",
        shortDescription: "Post-treatment essentials bundle for recovery and retention.",
        price: {
          currency: "CAD",
          amountCents: 6900,
        },
      },
    ],
    educationOffers: [
      {
        id: "edu_signature_method",
        slug: "signature-laser-method",
        locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
        title: "Daysi Signature Laser Method",
        shortDescription: "Professional education offer sold separately from treatment revenue.",
        status: "published",
        moduleSlugs: ["laser-foundations", "consulting-script", "treatment-protocols"],
        membershipEligible: true,
        staffGrantEnabled: true,
        requiresEntitlement: true,
        price: {
          currency: "CAD",
          amountCents: 49900,
          isFree: false,
        },
      },
      {
        id: "edu_treatment-architecture",
        slug: "treatment-architecture-masterclass",
        locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
        title: "Treatment Architecture Masterclass",
        shortDescription: "Draft education product used to validate admin-only publishing workflows.",
        status: "draft",
        moduleSlugs: ["assessment-frameworks", "session-design"],
        membershipEligible: false,
        staffGrantEnabled: true,
        requiresEntitlement: true,
        price: {
          currency: "CAD",
          amountCents: 79900,
          isFree: false,
        },
      },
    ],
    servicePackages: [
      {
        id: "spkg_lhr_series_3",
        slug: "laser-hair-removal-series-3",
        locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
        name: "Laser Hair Removal Series of 3",
        shortDescription:
          "Prepaid treatment package with three laser hair removal credits at a bundled rate.",
        status: "published",
        price: {
          currency: "CAD",
          amountCents: 79900,
        },
        serviceCredits: [
          {
            serviceSlug: "laser-hair-removal",
            quantity: 3,
          },
        ],
        featureTags: ["prepaid", "laser", "bundle"],
      },
    ],
  },
  coupons: [
    {
      id: "cpn_welcome10",
      code: "WELCOME10",
      name: "Welcome 10",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      status: "active",
      stackable: false,
      discountType: "percent",
      percentOff: 10,
      appliesToKinds: ["booking", "product", "servicePackage", "educationOffer"],
      appliesToRevenueStreams: ["services", "retail", "packages", "education"],
    },
    {
      id: "cpn_edu200",
      code: "EDU200",
      name: "Education Launch Credit",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      status: "active",
      stackable: false,
      discountType: "fixed_amount",
      amountOff: {
        currency: "CAD",
        amountCents: 20000,
      },
      appliesToKinds: ["educationOffer"],
      appliesToRevenueStreams: ["education"],
      eligibleReferenceIds: ["signature-laser-method"],
    },
  ],
  membershipPlans: [
    {
      id: "mplan_glow",
      slug: "glow-membership",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      name: "Glow Membership",
      description: "Monthly retail-benefit membership with member pricing on core services.",
      billingInterval: "month",
      price: {
        currency: "CAD",
        amountCents: 12900,
      },
      educationOnly: false,
      entitlements: {
        includedServiceSlugs: [],
        educationOfferSlugs: [],
        monthlyServiceCredits: [
          {
            serviceSlug: "skin-rejuvenation",
            quantity: 1,
          },
        ],
        memberDiscountPercent: 15,
      },
    },
    {
      id: "mplan_education",
      slug: "education-membership",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      name: "Education Membership",
      description: "Recurring access model for industry and proprietary method education.",
      billingInterval: "month",
      price: {
        currency: "CAD",
        amountCents: 19900,
      },
      educationOnly: true,
      entitlements: {
        includedServiceSlugs: [],
        educationOfferSlugs: ["signature-laser-method"],
        monthlyServiceCredits: [],
        memberDiscountPercent: 0,
      },
    },
  ],
  providerCompPlans: [
    {
      providerSlug: "ava-chen",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      commissionPercent: 38,
      appliesToRevenueStream: "services",
    },
    {
      providerSlug: "maya-lopez",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      commissionPercent: 35,
      appliesToRevenueStream: "services",
    },
  ],
  locationSchedules: [
    {
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      availability: [
        { daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 17 * 60 },
        { daysOfWeek: [6], startMinute: 10 * 60, endMinute: 16 * 60 },
      ],
    },
  ],
  locationSchedule: {
    locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
    availability: [
      { daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 17 * 60 },
      { daysOfWeek: [6], startMinute: 10 * 60, endMinute: 16 * 60 },
    ],
  },
  providers: [
    {
      slug: "ava-chen",
      name: "Ava Chen",
      email: "ava.chen@daysi.ca",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      serviceSlugs: ["laser-hair-removal", "skin-rejuvenation"],
      availability: [
        { daysOfWeek: [1, 3, 5], startMinute: 9 * 60, endMinute: 17 * 60 },
        { daysOfWeek: [2], startMinute: 11 * 60, endMinute: 17 * 60 },
      ],
      blockedWindows: [],
    },
    {
      slug: "maya-lopez",
      name: "Maya Lopez",
      email: "maya.lopez@daysi.ca",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      serviceSlugs: ["laser-hair-removal"],
      availability: [
        { daysOfWeek: [2, 4], startMinute: 10 * 60, endMinute: 18 * 60 },
        { daysOfWeek: [6], startMinute: 10 * 60, endMinute: 16 * 60 },
      ],
      blockedWindows: [],
    },
  ],
  machines: [
    {
      slug: "gentlemax-pro-a",
      name: "GentleMax Pro A",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      capabilitySlugs: ["laser-hair-removal", "skin-rejuvenation"],
      availability: [
        { daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 18 * 60 },
        { daysOfWeek: [6], startMinute: 10 * 60, endMinute: 16 * 60 },
      ],
      blockedWindows: [],
    },
    {
      slug: "lasemd-ultra-a",
      name: "LaseMD Ultra A",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      capabilitySlugs: ["skin-rejuvenation"],
      availability: [
        { daysOfWeek: [1, 3, 5], startMinute: 9 * 60, endMinute: 17 * 60 },
      ],
      blockedWindows: [
        {
          startAt: "2026-03-11T13:00:00.000Z",
          endAt: "2026-03-11T15:00:00.000Z",
        },
      ],
    },
  ],
  rooms: [
    {
      slug: "treatment-suite-a",
      name: "Treatment Suite A",
      locationSlug: env.DAYSI_DEFAULT_LOCATION_SLUG,
      capabilitySlugs: ["treatment-room"],
      availability: [
        { daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 18 * 60 },
        { daysOfWeek: [6], startMinute: 10 * 60, endMinute: 16 * 60 },
      ],
      blockedWindows: [],
    },
  ],
});
