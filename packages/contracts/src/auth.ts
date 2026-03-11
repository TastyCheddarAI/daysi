import { z } from "zod";

import {
  actorRoleSchema,
  locationSlugSchema,
  successEnvelope,
  tenantSlugSchema,
} from "./common";

export const actorSchema = z.object({
  userId: z.string().min(1),
  tenantSlug: tenantSlugSchema,
  email: z.string().email().optional(),
  displayName: z.string().min(1),
  roles: z.array(actorRoleSchema).min(1),
  locationScopes: z.array(locationSlugSchema),
  permissions: z.array(z.string().min(1)),
});

export const sessionExchangeRequestSchema = z.object({
  tenantSlug: tenantSlugSchema,
  providerUserId: z.string().trim().min(1),
  email: z.string().email().optional(),
  displayName: z.string().trim().min(1).default("Bootstrap User"),
  requestedRole: actorRoleSchema.default("customer"),
  locationScopes: z.array(locationSlugSchema).min(1).optional(),
  password: z.string().min(8).optional(),
});

export const sessionExchangeResponseSchema = successEnvelope(
  z.object({
    sessionToken: z.string().min(1),
    actor: actorSchema,
    sessionMode: z.literal("bootstrap"),
  }),
);

export const meResponseSchema = successEnvelope(
  z.object({
    actor: actorSchema,
    sessionMode: z.literal("bootstrap"),
  }),
);

export type Actor = z.infer<typeof actorSchema>;
export type SessionExchangeRequest = z.infer<typeof sessionExchangeRequestSchema>;
