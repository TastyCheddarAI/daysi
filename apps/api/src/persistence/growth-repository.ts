import type {
  ReferralCode,
  ReferralProgram,
  ReferralRelationship,
  ReferralRewardEvent,
} from "../../../../packages/domain/src";

import {
  getReferralProgram,
  listReferralCodes,
  listReferralPrograms,
  listReferralRelationships,
  listReferralRewardEvents,
  saveReferralCode,
  saveReferralProgram,
  saveReferralRelationship,
  saveReferralRewardEvent,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface GrowthRepository {
  referrals: {
    saveProgram(program: ReferralProgram): Awaitable<void>;
    getProgram(programId: string): Awaitable<ReferralProgram | undefined>;
    listPrograms(locationSlug?: string): Awaitable<ReferralProgram[]>;
    saveCode(code: ReferralCode): Awaitable<void>;
    listCodes(locationSlug?: string): Awaitable<ReferralCode[]>;
    saveRelationship(relationship: ReferralRelationship): Awaitable<void>;
    listRelationships(locationSlug?: string): Awaitable<ReferralRelationship[]>;
    saveRewardEvent(event: ReferralRewardEvent): Awaitable<void>;
    listRewardEvents(locationSlug?: string): Awaitable<ReferralRewardEvent[]>;
  };
}

export const createInMemoryGrowthRepository = (): GrowthRepository => ({
  referrals: {
    saveProgram: (program) => {
      saveReferralProgram(program);
    },
    getProgram: getReferralProgram,
    listPrograms: listReferralPrograms,
    saveCode: (code) => {
      saveReferralCode(code);
    },
    listCodes: listReferralCodes,
    saveRelationship: (relationship) => {
      saveReferralRelationship(relationship);
    },
    listRelationships: listReferralRelationships,
    saveRewardEvent: (event) => {
      saveReferralRewardEvent(event);
    },
    listRewardEvents: listReferralRewardEvents,
  },
});
