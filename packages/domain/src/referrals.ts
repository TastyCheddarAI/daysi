import { randomUUID } from "node:crypto";

import type { OrderRecord } from "./commerce";
import type { AppActor } from "./identity";

export type ReferralProgramStatus = "draft" | "active" | "inactive" | "archived";
export type ReferralRelationshipStatus = "applied" | "qualified";
export type ReferralRewardKind = "account_credit";
export type ReferralRewardRecipient = "referee" | "referrer" | "referrer_level_2";
export type ReferralRewardEventStatus = "earned" | "reversed";

export interface ReferralRewardDefinition {
  kind: ReferralRewardKind;
  amount: {
    currency: string;
    amountCents: number;
  };
}

export interface ReferralProgram {
  id: string;
  locationSlug: string;
  name: string;
  status: ReferralProgramStatus;
  codePrefix: string;
  referredReward?: ReferralRewardDefinition;
  advocateReward?: ReferralRewardDefinition;
  secondLevelReward?: ReferralRewardDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralCode {
  id: string;
  programId: string;
  locationSlug: string;
  ownerUserId?: string;
  ownerEmail: string;
  code: string;
  createdAt: string;
}

export interface ReferralRelationship {
  id: string;
  programId: string;
  locationSlug: string;
  referralCodeId: string;
  referralCode: string;
  referrerUserId?: string;
  referrerEmail: string;
  refereeUserId?: string;
  refereeEmail: string;
  status: ReferralRelationshipStatus;
  createdAt: string;
  updatedAt: string;
  firstQualifiedOrderId?: string;
  qualifiedAt?: string;
}

export interface ReferralRewardEvent {
  id: string;
  programId: string;
  relationshipId: string;
  locationSlug: string;
  recipient: ReferralRewardRecipient;
  recipientUserId?: string;
  recipientEmail: string;
  reward: ReferralRewardDefinition;
  sourceOrderId?: string;
  status: ReferralRewardEventStatus;
  creditEntryId?: string;
  createdAt: string;
  reversedAt?: string;
}

export interface ReferralAccountOverview {
  locationSlug: string;
  program: ReferralProgram | null;
  referralCode: ReferralCode | null;
  appliedRelationship: ReferralRelationship | null;
  invitedRelationships: ReferralRelationship[];
  rewardEvents: ReferralRewardEvent[];
  summary: {
    invitedCount: number;
    qualifiedInviteCount: number;
    totalRewardAmount: {
      currency: string;
      amountCents: number;
    };
  };
}

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() ?? "";

const sanitizeCodePrefix = (value?: string): string => {
  const normalized = (value ?? "DAYSI")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized || "DAYSI";
};

const actorMatchesIdentity = (
  actor: Pick<AppActor, "userId" | "email">,
  input: { userId?: string; email?: string },
): boolean =>
  (!!input.userId && actor.userId === input.userId) ||
  (!!actor.email && normalizeEmail(actor.email) === normalizeEmail(input.email));

const relationshipMatchesReferee = (
  relationship: ReferralRelationship,
  actor: Pick<AppActor, "userId" | "email">,
): boolean =>
  actorMatchesIdentity(actor, {
    userId: relationship.refereeUserId,
    email: relationship.refereeEmail,
  });

const relationshipMatchesReferrer = (
  relationship: ReferralRelationship,
  actor: Pick<AppActor, "userId" | "email">,
): boolean =>
  actorMatchesIdentity(actor, {
    userId: relationship.referrerUserId,
    email: relationship.referrerEmail,
  });

const findParentRelationship = (
  relationships: ReferralRelationship[],
  relationship: ReferralRelationship,
): ReferralRelationship | undefined =>
  relationships.find(
    (candidate) =>
      candidate.locationSlug === relationship.locationSlug &&
      candidate.programId === relationship.programId &&
      ((candidate.refereeUserId &&
        relationship.referrerUserId &&
        candidate.refereeUserId === relationship.referrerUserId) ||
        normalizeEmail(candidate.refereeEmail) ===
          normalizeEmail(relationship.referrerEmail)),
  );

export const normalizeReferralCode = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

export const createReferralProgram = (input: {
  locationSlug: string;
  name: string;
  status?: ReferralProgramStatus;
  codePrefix?: string;
  referredReward?: ReferralRewardDefinition;
  advocateReward?: ReferralRewardDefinition;
  secondLevelReward?: ReferralRewardDefinition;
  now?: string;
}): ReferralProgram => {
  if (!input.referredReward && !input.advocateReward && !input.secondLevelReward) {
    throw new Error("Referral program must define at least one reward.");
  }

  const now = input.now ?? new Date().toISOString();

  return {
    id: `rprog_${randomUUID()}`,
    locationSlug: input.locationSlug,
    name: input.name,
    status: input.status ?? "active",
    codePrefix: sanitizeCodePrefix(input.codePrefix),
    referredReward: input.referredReward,
    advocateReward: input.advocateReward,
    secondLevelReward: input.secondLevelReward,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateReferralProgram = (input: {
  program: ReferralProgram;
  name?: string;
  status?: ReferralProgramStatus;
  codePrefix?: string;
  referredReward?: ReferralRewardDefinition | null;
  advocateReward?: ReferralRewardDefinition | null;
  secondLevelReward?: ReferralRewardDefinition | null;
  now?: string;
}): ReferralProgram => {
  const nextProgram: ReferralProgram = {
    ...input.program,
    name: input.name ?? input.program.name,
    status: input.status ?? input.program.status,
    codePrefix:
      input.codePrefix !== undefined
        ? sanitizeCodePrefix(input.codePrefix)
        : input.program.codePrefix,
    referredReward:
      input.referredReward === null
        ? undefined
        : input.referredReward ?? input.program.referredReward,
    advocateReward:
      input.advocateReward === null
        ? undefined
        : input.advocateReward ?? input.program.advocateReward,
    secondLevelReward:
      input.secondLevelReward === null
        ? undefined
        : input.secondLevelReward ?? input.program.secondLevelReward,
    updatedAt: input.now ?? new Date().toISOString(),
  };

  if (
    !nextProgram.referredReward &&
    !nextProgram.advocateReward &&
    !nextProgram.secondLevelReward
  ) {
    throw new Error("Referral program must define at least one reward.");
  }

  return nextProgram;
};

export const listReferralProgramsForLocation = (
  programs: ReferralProgram[],
  locationSlug: string,
): ReferralProgram[] =>
  programs
    .filter((program) => program.locationSlug === locationSlug)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const resolveActiveReferralProgram = (
  programs: ReferralProgram[],
  locationSlug: string,
): ReferralProgram | undefined =>
  listReferralProgramsForLocation(programs, locationSlug).find(
    (program) => program.status === "active",
  );

const buildGeneratedReferralCode = (prefix: string): string =>
  `${prefix}${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export const createReferralCode = (input: {
  programId: string;
  locationSlug: string;
  ownerUserId?: string;
  ownerEmail: string;
  code: string;
  now?: string;
}): ReferralCode => ({
  id: `rcode_${randomUUID()}`,
  programId: input.programId,
  locationSlug: input.locationSlug,
  ownerUserId: input.ownerUserId,
  ownerEmail: normalizeEmail(input.ownerEmail),
  code: normalizeReferralCode(input.code),
  createdAt: input.now ?? new Date().toISOString(),
});

export const ensureReferralCodeForActor = (input: {
  actor: Pick<AppActor, "userId" | "email">;
  program: ReferralProgram | undefined;
  existingCodes: ReferralCode[];
  now?: string;
}): ReferralCode | undefined => {
  if (!input.program || !input.actor.email) {
    return undefined;
  }

  const existing = input.existingCodes.find(
    (code) =>
      code.programId === input.program?.id &&
      actorMatchesIdentity(input.actor, {
        userId: code.ownerUserId,
        email: code.ownerEmail,
      }),
  );

  if (existing) {
    return existing;
  }

  return createReferralCode({
    programId: input.program.id,
    locationSlug: input.program.locationSlug,
    ownerUserId: input.actor.userId,
    ownerEmail: input.actor.email,
    code: buildGeneratedReferralCode(input.program.codePrefix),
    now: input.now,
  });
};

export const findReferralCodeByValue = (
  codes: ReferralCode[],
  input: { locationSlug: string; code: string },
): ReferralCode | undefined =>
  codes.find(
    (entry) =>
      entry.locationSlug === input.locationSlug &&
      normalizeReferralCode(entry.code) === normalizeReferralCode(input.code),
  );

export const createReferralRelationship = (input: {
  program: ReferralProgram;
  referralCode: ReferralCode;
  actor: Pick<AppActor, "userId" | "email">;
  existingRelationships: ReferralRelationship[];
  now?: string;
}): ReferralRelationship => {
  if (!input.actor.email) {
    throw new Error("Referral application requires an actor email.");
  }

  if (input.program.status !== "active") {
    throw new Error("Referral program is not active.");
  }

  if (
    actorMatchesIdentity(input.actor, {
      userId: input.referralCode.ownerUserId,
      email: input.referralCode.ownerEmail,
    })
  ) {
    throw new Error("Self-referral is not allowed.");
  }

  const alreadyApplied = input.existingRelationships.some(
    (relationship) =>
      relationship.locationSlug === input.program.locationSlug &&
      relationshipMatchesReferee(relationship, input.actor),
  );

  if (alreadyApplied) {
    throw new Error("Referral code has already been applied for this location.");
  }

  const now = input.now ?? new Date().toISOString();

  return {
    id: `rrel_${randomUUID()}`,
    programId: input.program.id,
    locationSlug: input.program.locationSlug,
    referralCodeId: input.referralCode.id,
    referralCode: input.referralCode.code,
    referrerUserId: input.referralCode.ownerUserId,
    referrerEmail: input.referralCode.ownerEmail,
    refereeUserId: input.actor.userId,
    refereeEmail: normalizeEmail(input.actor.email),
    status: "applied",
    createdAt: now,
    updatedAt: now,
  };
};

export const createReferralRewardEvent = (input: {
  programId: string;
  relationshipId: string;
  locationSlug: string;
  recipient: ReferralRewardRecipient;
  recipientUserId?: string;
  recipientEmail: string;
  reward: ReferralRewardDefinition;
  sourceOrderId?: string;
  creditEntryId?: string;
  now?: string;
}): ReferralRewardEvent => ({
  id: `rrew_${randomUUID()}`,
  programId: input.programId,
  relationshipId: input.relationshipId,
  locationSlug: input.locationSlug,
  recipient: input.recipient,
  recipientUserId: input.recipientUserId,
  recipientEmail: normalizeEmail(input.recipientEmail),
  reward: input.reward,
  sourceOrderId: input.sourceOrderId,
  status: "earned",
  creditEntryId: input.creditEntryId,
  createdAt: input.now ?? new Date().toISOString(),
});

export const qualifyReferralOrder = (input: {
  order: OrderRecord;
  relationships: ReferralRelationship[];
  programs: ReferralProgram[];
  rewardEvents: ReferralRewardEvent[];
  now?: string;
}): {
  updatedRelationships: ReferralRelationship[];
  rewardEvents: ReferralRewardEvent[];
} => {
  if (input.order.status !== "paid") {
    return {
      updatedRelationships: [],
      rewardEvents: [],
    };
  }

  const relationship = input.relationships.find(
    (entry) =>
      entry.locationSlug === input.order.locationSlug &&
      entry.status === "applied" &&
      ((input.order.actorUserId && entry.refereeUserId === input.order.actorUserId) ||
        normalizeEmail(entry.refereeEmail) ===
          normalizeEmail(input.order.customer.email)),
  );

  if (!relationship) {
    return {
      updatedRelationships: [],
      rewardEvents: [],
    };
  }

  const program = input.programs.find((entry) => entry.id === relationship.programId);
  if (!program) {
    return {
      updatedRelationships: [],
      rewardEvents: [],
    };
  }

  const now = input.now ?? new Date().toISOString();
  const updatedRelationship: ReferralRelationship = {
    ...relationship,
    status: "qualified",
    firstQualifiedOrderId: input.order.id,
    qualifiedAt: now,
    updatedAt: now,
  };
  const nextRewardEvents: ReferralRewardEvent[] = [];
  const hasMatchingRewardEvent = (recipient: ReferralRewardRecipient): boolean =>
    input.rewardEvents.some(
      (event) =>
        event.relationshipId === relationship.id &&
        event.sourceOrderId === input.order.id &&
        event.recipient === recipient &&
        event.status === "earned",
    );

  if (program.advocateReward && !hasMatchingRewardEvent("referrer")) {
    nextRewardEvents.push(
      createReferralRewardEvent({
        programId: program.id,
        relationshipId: relationship.id,
        locationSlug: relationship.locationSlug,
        recipient: "referrer",
        recipientUserId: relationship.referrerUserId,
        recipientEmail: relationship.referrerEmail,
        reward: program.advocateReward,
        sourceOrderId: input.order.id,
        now,
      }),
    );
  }

  const parentRelationship = findParentRelationship(input.relationships, relationship);
  if (
    program.secondLevelReward &&
    parentRelationship &&
    !hasMatchingRewardEvent("referrer_level_2")
  ) {
    nextRewardEvents.push(
      createReferralRewardEvent({
        programId: program.id,
        relationshipId: relationship.id,
        locationSlug: relationship.locationSlug,
        recipient: "referrer_level_2",
        recipientUserId: parentRelationship.referrerUserId,
        recipientEmail: parentRelationship.referrerEmail,
        reward: program.secondLevelReward,
        sourceOrderId: input.order.id,
        now,
      }),
    );
  }

  return {
    updatedRelationships: [updatedRelationship],
    rewardEvents: nextRewardEvents,
  };
};

export const listReferralRelationshipsForActor = (input: {
  relationships: ReferralRelationship[];
  actor: Pick<AppActor, "userId" | "email">;
  locationSlug: string;
}): ReferralRelationship[] =>
  input.relationships
    .filter(
      (relationship) =>
        relationship.locationSlug === input.locationSlug &&
        relationshipMatchesReferrer(relationship, input.actor),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const getReferralRelationshipForReferee = (input: {
  relationships: ReferralRelationship[];
  actor: Pick<AppActor, "userId" | "email">;
  locationSlug: string;
}): ReferralRelationship | undefined =>
  input.relationships.find(
    (relationship) =>
      relationship.locationSlug === input.locationSlug &&
      relationshipMatchesReferee(relationship, input.actor),
  );

export const listReferralRewardEventsForActor = (input: {
  rewardEvents: ReferralRewardEvent[];
  actor: Pick<AppActor, "userId" | "email">;
  locationSlug: string;
}): ReferralRewardEvent[] =>
  input.rewardEvents
    .filter(
      (event) =>
        event.locationSlug === input.locationSlug &&
        actorMatchesIdentity(input.actor, {
          userId: event.recipientUserId,
          email: event.recipientEmail,
        }),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const buildReferralAccountOverview = (input: {
  actor: Pick<AppActor, "userId" | "email">;
  locationSlug: string;
  program: ReferralProgram | undefined;
  referralCode: ReferralCode | undefined;
  relationships: ReferralRelationship[];
  rewardEvents: ReferralRewardEvent[];
}): ReferralAccountOverview => {
  const invitedRelationships = listReferralRelationshipsForActor({
    relationships: input.relationships,
    actor: input.actor,
    locationSlug: input.locationSlug,
  });
  const actorRewardEvents = listReferralRewardEventsForActor({
    rewardEvents: input.rewardEvents,
    actor: input.actor,
    locationSlug: input.locationSlug,
  });
  const currency = actorRewardEvents[0]?.reward.amount.currency ?? "CAD";

  return {
    locationSlug: input.locationSlug,
    program: input.program ?? null,
    referralCode: input.referralCode ?? null,
    appliedRelationship:
      getReferralRelationshipForReferee({
        relationships: input.relationships,
        actor: input.actor,
        locationSlug: input.locationSlug,
      }) ?? null,
    invitedRelationships,
    rewardEvents: actorRewardEvents,
    summary: {
      invitedCount: invitedRelationships.length,
      qualifiedInviteCount: invitedRelationships.filter(
        (relationship) => relationship.status === "qualified",
      ).length,
      totalRewardAmount: {
        currency,
        amountCents: actorRewardEvents.reduce(
          (total, event) => total + event.reward.amount.amountCents,
          0,
        ),
      },
    },
  };
};
