import { z } from "zod";

import {
  bookingPolicySummarySchema,
  catalogPriceSummarySchema,
  publicServiceDetailSchema,
} from "./catalog";
import { isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";
import { membershipEntitlementSchema, membershipPlanSchema } from "./memberships";
import {
  adminProviderSummarySchema,
  machineScheduleSchema,
  recurringScheduleWindowSchema,
  roomScheduleSchema,
} from "./operations";
import {
  featureModuleSchema,
  tenantLocationSummarySchema,
  tenantOrganizationSummarySchema,
} from "./platform";

export const adminOrganizationSchema = tenantOrganizationSummarySchema;

export const adminOrganizationsResponseSchema = successEnvelope(
  z.object({
    organizations: z.array(adminOrganizationSchema),
  }),
);

export const adminOrganizationCreateRequestSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  operatingMode: z.enum(["corporate", "franchise"]),
});

export const adminOrganizationUpdateRequestSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    operatingMode: z.enum(["corporate", "franchise"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one organization field must be provided.",
  });

export const adminOrganizationResponseSchema = successEnvelope(
  z.object({
    organization: adminOrganizationSchema,
  }),
);

export const adminAccessAssignmentRoleSchema = z.enum(["staff", "admin", "owner"]);

export const adminAccessAssignmentSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: adminAccessAssignmentRoleSchema,
  locationScopes: z.array(locationSlugSchema).min(1),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const adminAccessAssignmentsResponseSchema = successEnvelope(
  z.object({
    assignments: z.array(adminAccessAssignmentSchema),
  }),
);

export const adminAccessAssignmentCreateRequestSchema = z.object({
  email: z.string().email(),
  role: adminAccessAssignmentRoleSchema,
  locationScopes: z.array(locationSlugSchema).min(1),
});

export const adminAccessAssignmentUpdateRequestSchema = z
  .object({
    role: adminAccessAssignmentRoleSchema.optional(),
    locationScopes: z.array(locationSlugSchema).min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one access assignment field must be provided.",
  });

export const adminAccessAssignmentResponseSchema = successEnvelope(
  z.object({
    assignment: adminAccessAssignmentSchema,
  }),
);

export const adminRoleDefinitionSchema = z.object({
  code: z.enum(["customer", "provider", "staff", "admin", "owner"]),
  name: z.string().min(1),
  description: z.string().min(1),
  permissions: z.array(z.string().min(1)).min(1),
  assignable: z.boolean(),
  requiresLocationScope: z.boolean(),
});

export const adminRolesResponseSchema = successEnvelope(
  z.object({
    roles: z.array(adminRoleDefinitionSchema),
  }),
);

export const adminRoleAssignmentSchema = adminAccessAssignmentSchema;

export const adminRoleAssignmentsResponseSchema = successEnvelope(
  z.object({
    assignments: z.array(adminRoleAssignmentSchema),
  }),
);

export const adminRoleAssignmentCreateRequestSchema = adminAccessAssignmentCreateRequestSchema;

export const adminRoleAssignmentUpdateRequestSchema = adminAccessAssignmentUpdateRequestSchema;

export const adminRoleAssignmentResponseSchema = successEnvelope(
  z.object({
    assignment: adminRoleAssignmentSchema,
  }),
);

export const adminLocationSchema = tenantLocationSummarySchema.extend({
  operatingSchedule: z.array(recurringScheduleWindowSchema),
});

export const adminLocationsResponseSchema = successEnvelope(
  z.object({
    locations: z.array(adminLocationSchema),
  }),
);

export const adminLocationCreateRequestSchema = z.object({
  slug: locationSlugSchema,
  name: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  enabledModules: z.array(featureModuleSchema),
  operatingSchedule: z.array(recurringScheduleWindowSchema).min(1),
});

export const adminLocationUpdateRequestSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    organizationId: z.string().trim().min(1).optional(),
    enabledModules: z.array(featureModuleSchema).optional(),
    operatingSchedule: z.array(recurringScheduleWindowSchema).min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one location field must be provided.",
  });

export const adminLocationResponseSchema = successEnvelope(
  z.object({
    location: adminLocationSchema,
  }),
);

export const adminServiceCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1),
  variantSlug: z.string().trim().min(1),
  categorySlug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  shortDescription: z.string().trim().min(1),
  description: z.string().trim().min(1),
  durationMinutes: z.number().int().positive(),
  bookable: z.boolean(),
  price: catalogPriceSummarySchema,
  bookingPolicy: bookingPolicySummarySchema,
  machineCapabilities: z.array(z.string().trim().min(1)).min(1),
  roomCapabilities: z.array(z.string().trim().min(1)).default([]),
  featureTags: z.array(z.string().trim().min(1)),
});

export const adminServiceUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    variantSlug: z.string().trim().min(1).optional(),
    categorySlug: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    shortDescription: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    durationMinutes: z.number().int().positive().optional(),
    bookable: z.boolean().optional(),
    price: catalogPriceSummarySchema.optional(),
    bookingPolicy: bookingPolicySummarySchema.optional(),
    machineCapabilities: z.array(z.string().trim().min(1)).min(1).optional(),
    roomCapabilities: z.array(z.string().trim().min(1)).optional(),
    featureTags: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one service field must be provided.",
  });

export const adminServicesResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    services: z.array(publicServiceDetailSchema),
  }),
);

export const adminServiceResponseSchema = successEnvelope(
  z.object({
    service: publicServiceDetailSchema,
  }),
);

export const adminMachineBlockedWindowSchema = z.object({
  startsAt: isoTimestampSchema,
  endsAt: isoTimestampSchema,
});

export const adminProviderDetailSchema = adminProviderSummarySchema.extend({
  template: z.array(recurringScheduleWindowSchema).min(1),
  blockedWindows: z.array(adminMachineBlockedWindowSchema),
});

export const adminProviderResponseSchema = successEnvelope(
  z.object({
    provider: adminProviderDetailSchema,
  }),
);

export const adminProviderCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().email(),
  serviceSlugs: z.array(z.string().trim().min(1)).min(1),
  template: z.array(recurringScheduleWindowSchema).min(1),
  blockedWindows: z.array(adminMachineBlockedWindowSchema).default([]),
});

export const adminProviderUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    name: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    serviceSlugs: z.array(z.string().trim().min(1)).min(1).optional(),
    template: z.array(recurringScheduleWindowSchema).min(1).optional(),
    blockedWindows: z.array(adminMachineBlockedWindowSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one provider field must be provided.",
  });

export const adminMachineResponseSchema = successEnvelope(
  z.object({
    machine: machineScheduleSchema,
  }),
);

export const adminRoomsResponseSchema = successEnvelope(
  z.object({
    rooms: z.array(roomScheduleSchema),
  }),
);

export const adminRoomResponseSchema = successEnvelope(
  z.object({
    room: roomScheduleSchema,
  }),
);

export const adminMachineCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  capabilities: z.array(z.string().trim().min(1)).min(1),
  template: z.array(recurringScheduleWindowSchema).min(1),
  blockedWindows: z.array(adminMachineBlockedWindowSchema).default([]),
});

export const adminMachineUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    name: z.string().trim().min(1).optional(),
    capabilities: z.array(z.string().trim().min(1)).min(1).optional(),
    template: z.array(recurringScheduleWindowSchema).min(1).optional(),
    blockedWindows: z.array(adminMachineBlockedWindowSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one machine field must be provided.",
  });

export const adminRoomCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  capabilities: z.array(z.string().trim().min(1)).default([]),
  template: z.array(recurringScheduleWindowSchema).min(1),
  blockedWindows: z.array(adminMachineBlockedWindowSchema).default([]),
});

export const adminRoomUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    name: z.string().trim().min(1).optional(),
    capabilities: z.array(z.string().trim().min(1)).optional(),
    template: z.array(recurringScheduleWindowSchema).min(1).optional(),
    blockedWindows: z.array(adminMachineBlockedWindowSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one room field must be provided.",
  });

export const providerCompRevenueStreamSchema = z.enum(["services", "retail", "mixed"]);

export const adminProviderCompPlanSchema = z.object({
  providerSlug: z.string().trim().min(1),
  locationSlug: locationSlugSchema,
  serviceSlug: z.string().trim().min(1).optional(),
  commissionPercent: z.number().min(0).max(100),
  appliesToRevenueStream: providerCompRevenueStreamSchema,
});

export const adminProviderCompPlansResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    compPlans: z.array(adminProviderCompPlanSchema),
  }),
);

export const adminProviderCompPlanResponseSchema = successEnvelope(
  z.object({
    compPlan: adminProviderCompPlanSchema,
  }),
);

export const adminProviderCompPlanCreateRequestSchema = adminProviderCompPlanSchema;

export const adminProviderCompPlanUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    serviceSlug: z.string().trim().min(1).optional(),
    commissionPercent: z.number().min(0).max(100).optional(),
    appliesToRevenueStream: providerCompRevenueStreamSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one provider comp field must be provided.",
  });

export const adminMembershipPlansResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    plans: z.array(membershipPlanSchema),
  }),
);

export const adminMembershipPlanResponseSchema = successEnvelope(
  z.object({
    plan: membershipPlanSchema,
  }),
);

export const adminMembershipPlanCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  billingInterval: z.literal("month"),
  price: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    amountCents: z.number().int().nonnegative(),
  }),
  educationOnly: z.boolean(),
  entitlements: membershipEntitlementSchema,
});

export const adminMembershipPlanUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    billingInterval: z.literal("month").optional(),
    price: z
      .object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        amountCents: z.number().int().nonnegative(),
      })
      .optional(),
    educationOnly: z.boolean().optional(),
    entitlements: membershipEntitlementSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one membership plan field must be provided.",
  });
