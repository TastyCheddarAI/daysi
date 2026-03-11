import { z } from "zod";

export const apiVersionSchema = z.literal("v1");
export const isoTimestampSchema = z.string().datetime({ offset: true });
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const tenantSlugSchema = z.string().trim().min(1).regex(/^[a-z0-9-]+$/);
export const locationSlugSchema = z.string().trim().min(1).regex(/^[a-z0-9-]+$/);
export const actorRoleSchema = z.enum(["customer", "provider", "staff", "admin", "owner"]);
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);

export const moneySchema = z.object({
  currency: currencyCodeSchema,
  amountCents: z.number().int().nonnegative(),
});

export const apiErrorCodeSchema = z.enum([
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "validation_error",
  "internal_error",
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    ok: z.literal(true),
    data: schema,
  });

export const errorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: apiErrorSchema,
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
