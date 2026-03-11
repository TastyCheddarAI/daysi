import {
  buildReferralAccountOverview,
  createCreditEntry,
  ensureReferralCodeForActor,
  qualifyReferralOrder,
  resolveActiveReferralProgram,
  type AppActor,
  type ReferralRewardEvent,
} from "../../../packages/domain/src";

import { recordCustomerEvent } from "./customer-context-support";
import type { AppRepositories } from "./persistence/app-repositories";

const buildReferralRewardNote = (recipient: ReferralRewardEvent["recipient"]): string => {
  if (recipient === "referee") {
    return "Referral welcome reward.";
  }

  if (recipient === "referrer_level_2") {
    return "Second-level referral reward.";
  }

  return "Referral advocate reward.";
};

export const recordReferralRewardEvent = async (
  repositories: AppRepositories,
  event: ReferralRewardEvent,
  now = new Date().toISOString(),
): Promise<ReferralRewardEvent> => {
  const creditEntry = await repositories.commerce.credits.saveEntry(
    createCreditEntry({
      locationSlug: event.locationSlug,
      type: "grant",
      amount: event.reward.amount,
      customerEmail: event.recipientEmail,
      actorUserId: event.recipientUserId,
      sourceOrderId: event.sourceOrderId,
      note: buildReferralRewardNote(event.recipient),
      now,
    }),
  );

  const persistedEvent = {
    ...event,
    creditEntryId: creditEntry.id,
  };
  await repositories.growth.referrals.saveRewardEvent(persistedEvent);
  await recordCustomerEvent({
    repositories,
    locationSlug: persistedEvent.locationSlug,
    customerEmail: persistedEvent.recipientEmail,
    actorUserId: persistedEvent.recipientUserId,
    source: "referral",
    eventType: "referral.reward_earned",
    payload: {
      relationshipId: persistedEvent.relationshipId,
      recipient: persistedEvent.recipient,
      amountCents: persistedEvent.reward.amount.amountCents,
      sourceOrderId: persistedEvent.sourceOrderId,
    },
    occurredAt: now,
  });
  return persistedEvent;
};

export const ensureActorReferralCode = async (input: {
  repositories: AppRepositories;
  actor: AppActor;
  locationSlug: string;
  now?: string;
}) => {
  const [resolvedCodes, resolvedPrograms] = await Promise.all([
    input.repositories.growth.referrals.listCodes(input.locationSlug),
    input.repositories.growth.referrals.listPrograms(input.locationSlug),
  ]);
  const program = resolveActiveReferralProgram(
    resolvedPrograms,
    input.locationSlug,
  );
  const referralCode = ensureReferralCodeForActor({
    actor: input.actor,
    program,
    existingCodes: resolvedCodes,
    now: input.now,
  });

  if (referralCode && !resolvedCodes.some((code) => code.id === referralCode.id)) {
    await input.repositories.growth.referrals.saveCode(referralCode);
  }

  return referralCode;
};

export const buildReferralOverviewForActor = async (input: {
  repositories: AppRepositories;
  actor: AppActor;
  locationSlug: string;
  ensureCode?: boolean;
  now?: string;
}) => {
  const programs = await input.repositories.growth.referrals.listPrograms(input.locationSlug);
  const codes = await input.repositories.growth.referrals.listCodes(input.locationSlug);
  const relationships = await input.repositories.growth.referrals.listRelationships(
    input.locationSlug,
  );
  const rewardEvents = await input.repositories.growth.referrals.listRewardEvents(
    input.locationSlug,
  );
  const referralCode = input.ensureCode
    ? await ensureActorReferralCode({
        repositories: input.repositories,
        actor: input.actor,
        locationSlug: input.locationSlug,
        now: input.now,
      })
    : codes.find(
        (code) =>
          (code.ownerUserId && code.ownerUserId === input.actor.userId) ||
          (input.actor.email && code.ownerEmail === input.actor.email.toLowerCase()),
      );

  return buildReferralAccountOverview({
    actor: input.actor,
    locationSlug: input.locationSlug,
    program: resolveActiveReferralProgram(programs, input.locationSlug),
    referralCode,
    relationships,
    rewardEvents,
  });
};

export const processReferralQualificationForOrder = async (
  repositories: AppRepositories,
  orderId: string,
  now = new Date().toISOString(),
): Promise<void> => {
  const storedOrder = await repositories.commerce.orders.getStored(orderId);
  if (!storedOrder) {
    return;
  }

  const locationSlug = storedOrder.order.locationSlug;
  const relationships = await repositories.growth.referrals.listRelationships(locationSlug);
  const programs = await repositories.growth.referrals.listPrograms(locationSlug);
  const rewardEvents = await repositories.growth.referrals.listRewardEvents(locationSlug);
  const qualification = qualifyReferralOrder({
    order: storedOrder.order,
    relationships,
    programs,
    rewardEvents,
    now,
  });

  for (const relationship of qualification.updatedRelationships) {
    await repositories.growth.referrals.saveRelationship(relationship);
  }

  for (const event of qualification.rewardEvents) {
    await recordReferralRewardEvent(repositories, event, now);
  }
};
