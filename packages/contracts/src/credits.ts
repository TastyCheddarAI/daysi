import { z } from "zod";

import { locationSlugSchema, moneySchema, successEnvelope } from "./common";

export const creditEntryTypeSchema = z.enum(["grant", "redeem", "restore"]);

export const creditEntrySchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  type: creditEntryTypeSchema,
  amount: moneySchema,
  customerEmail: z.string().email(),
  actorUserId: z.string().min(1).optional(),
  sourceOrderId: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  grantedByUserId: z.string().min(1).optional(),
  createdAt: z.string().datetime({ offset: true }),
});

export const serviceAllowanceSchema = z.object({
  planSlug: z.string().min(1),
  serviceSlug: z.string().min(1),
  totalQuantity: z.number().int().nonnegative(),
  usedQuantity: z.number().int().nonnegative(),
  remainingQuantity: z.number().int().nonnegative(),
});

export const creditBalanceSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  availableAmount: moneySchema,
  entries: z.array(creditEntrySchema),
  serviceAllowances: z.array(serviceAllowanceSchema),
});

export const myCreditsResponseSchema = successEnvelope(
  z.object({
    credits: creditBalanceSchema,
  }),
);

export const adminCreditGrantRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  customerEmail: z.string().email(),
  actorUserId: z.string().trim().min(1).optional(),
  amount: moneySchema,
  note: z.string().trim().min(1).optional(),
});

export const adminCreditGrantResponseSchema = successEnvelope(
  z.object({
    entry: creditEntrySchema,
  }),
);
