import { z } from "zod";

import { isoTimestampSchema, locationSlugSchema, moneySchema, successEnvelope } from "./common";

export const referralProgramStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
  "archived",
]);

export const referralRewardRecipientSchema = z.enum([
  "referee",
  "referrer",
  "referrer_level_2",
]);

export const referralRewardEventStatusSchema = z.enum(["earned", "reversed"]);

export const referralRewardDefinitionSchema = z.object({
  kind: z.literal("account_credit"),
  amount: moneySchema,
});

export const referralProgramSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  name: z.string().min(1),
  status: referralProgramStatusSchema,
  codePrefix: z.string().min(1),
  referredReward: referralRewardDefinitionSchema.optional(),
  advocateReward: referralRewardDefinitionSchema.optional(),
  secondLevelReward: referralRewardDefinitionSchema.optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const referralCodeSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  locationSlug: locationSlugSchema,
  ownerUserId: z.string().min(1).optional(),
  ownerEmail: z.string().email(),
  code: z.string().min(3),
  createdAt: isoTimestampSchema,
});

export const referralRelationshipStatusSchema = z.enum(["applied", "qualified"]);

export const referralRelationshipSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  locationSlug: locationSlugSchema,
  referralCodeId: z.string().min(1),
  referralCode: z.string().min(3),
  referrerUserId: z.string().min(1).optional(),
  referrerEmail: z.string().email(),
  refereeUserId: z.string().min(1).optional(),
  refereeEmail: z.string().email(),
  status: referralRelationshipStatusSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  firstQualifiedOrderId: z.string().min(1).optional(),
  qualifiedAt: isoTimestampSchema.optional(),
});

export const referralRewardEventSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  relationshipId: z.string().min(1),
  locationSlug: locationSlugSchema,
  recipient: referralRewardRecipientSchema,
  recipientUserId: z.string().min(1).optional(),
  recipientEmail: z.string().email(),
  reward: referralRewardDefinitionSchema,
  sourceOrderId: z.string().min(1).optional(),
  status: referralRewardEventStatusSchema,
  creditEntryId: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  reversedAt: isoTimestampSchema.optional(),
});

export const myReferralResponseSchema = successEnvelope(
  z.object({
    overview: z.object({
      locationSlug: locationSlugSchema,
      program: referralProgramSchema.nullable(),
      referralCode: referralCodeSchema.nullable(),
      appliedRelationship: referralRelationshipSchema.nullable(),
      invitedRelationships: z.array(referralRelationshipSchema),
      rewardEvents: z.array(referralRewardEventSchema),
      summary: z.object({
        invitedCount: z.number().int().nonnegative(),
        qualifiedInviteCount: z.number().int().nonnegative(),
        totalRewardAmount: moneySchema,
      }),
    }),
  }),
);

export const applyReferralCodeRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  code: z.string().trim().min(3),
});

export const applyReferralCodeResponseSchema = successEnvelope(
  z.object({
    relationship: referralRelationshipSchema,
    rewardEvents: z.array(referralRewardEventSchema),
    overview: myReferralResponseSchema.shape.data.shape.overview,
  }),
);

export const adminReferralProgramsResponseSchema = successEnvelope(
  z.object({
    programs: z.array(referralProgramSchema),
  }),
);

export const adminReferralProgramCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  name: z.string().trim().min(1),
  status: referralProgramStatusSchema.default("active"),
  codePrefix: z.string().trim().min(1).max(16).optional(),
  referredReward: referralRewardDefinitionSchema.optional(),
  advocateReward: referralRewardDefinitionSchema.optional(),
  secondLevelReward: referralRewardDefinitionSchema.optional(),
});

export const adminReferralProgramUpdateRequestSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: referralProgramStatusSchema.optional(),
  codePrefix: z.string().trim().min(1).max(16).optional(),
  referredReward: referralRewardDefinitionSchema.nullable().optional(),
  advocateReward: referralRewardDefinitionSchema.nullable().optional(),
  secondLevelReward: referralRewardDefinitionSchema.nullable().optional(),
});

export const adminReferralProgramResponseSchema = successEnvelope(
  z.object({
    program: referralProgramSchema,
  }),
);
