import { z } from "zod";

import { locationSlugSchema, successEnvelope } from "./common";
import { featureModuleSchema } from "./platform";

export const onboardingReadinessStatusSchema = z.enum([
  "setup_required",
  "attention_required",
  "core_ready",
]);

export const onboardingChecklistItemSchema = z.object({
  key: z.enum([
    "organization_assigned",
    "operating_schedule",
    "services",
    "providers",
    "machines",
    "rooms",
    "memberships",
  ]),
  label: z.string().min(1),
  required: z.boolean(),
  isComplete: z.boolean(),
  detail: z.string().min(1),
});

export const locationOnboardingOverviewSchema = z.object({
  locationSlug: locationSlugSchema,
  locationName: z.string().min(1),
  organizationId: z.string().min(1),
  status: onboardingReadinessStatusSchema,
  enabledModules: z.array(featureModuleSchema),
  counts: z.object({
    serviceCount: z.number().int().nonnegative(),
    providerCount: z.number().int().nonnegative(),
    machineCount: z.number().int().nonnegative(),
    roomCount: z.number().int().nonnegative(),
    membershipPlanCount: z.number().int().nonnegative(),
    queuedImportJobCount: z.number().int().nonnegative(),
    failedImportJobCount: z.number().int().nonnegative(),
  }),
  checklist: z.array(onboardingChecklistItemSchema),
});

export const locationOnboardingOverviewResponseSchema = successEnvelope(
  z.object({
    overview: locationOnboardingOverviewSchema,
  }),
);
