import type { Pool } from "pg";

import type {
  ReferralCode,
  ReferralProgram,
  ReferralRelationship,
  ReferralRewardEvent,
} from "../../../../packages/domain/src";

type Queryable = Pick<Pool, "query">;

interface LocationScopeRow {
  brand_id: string;
  location_id: string;
}

const resolveLocationScope = async (
  db: Queryable,
  locationSlug: string,
): Promise<LocationScopeRow> => {
  const result = await db.query<LocationScopeRow>(
    `
      select brand_id, id as location_id
      from location
      where slug = $1
      order by created_at desc
      limit 2
    `,
    [locationSlug],
  );

  if (result.rowCount === 0) {
    throw new Error(`Location ${locationSlug} is not available in Postgres growth persistence.`);
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const parseReferralProgram = (value: unknown): ReferralProgram => value as ReferralProgram;
const parseReferralCode = (value: unknown): ReferralCode => value as ReferralCode;
const parseReferralRelationship = (value: unknown): ReferralRelationship =>
  value as ReferralRelationship;
const parseReferralRewardEvent = (value: unknown): ReferralRewardEvent =>
  value as ReferralRewardEvent;

export const createPostgresGrowthRepository = (db: Queryable) => ({
  referrals: {
    saveProgram: async (program: ReferralProgram): Promise<void> => {
      const scope = await resolveLocationScope(db, program.locationSlug);

      await db.query(
        `
          insert into growth_referral_program_projection (
            id,
            brand_id,
            location_id,
            location_slug,
            name,
            status,
            code_prefix,
            referred_reward,
            advocate_reward,
            second_level_reward,
            created_at,
            updated_at,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13::jsonb
          )
          on conflict (id) do update
          set
            name = excluded.name,
            status = excluded.status,
            code_prefix = excluded.code_prefix,
            referred_reward = excluded.referred_reward,
            advocate_reward = excluded.advocate_reward,
            second_level_reward = excluded.second_level_reward,
            updated_at = excluded.updated_at,
            record = excluded.record
        `,
        [
          program.id,
          scope.brand_id,
          scope.location_id,
          program.locationSlug,
          program.name,
          program.status,
          program.codePrefix,
          JSON.stringify(program.referredReward ?? null),
          JSON.stringify(program.advocateReward ?? null),
          JSON.stringify(program.secondLevelReward ?? null),
          program.createdAt,
          program.updatedAt,
          JSON.stringify(program),
        ],
      );
    },
    getProgram: async (programId: string): Promise<ReferralProgram | undefined> => {
      const result = await db.query<{ record: ReferralProgram }>(
        `
          select record
          from growth_referral_program_projection
          where id = $1
          limit 1
        `,
        [programId],
      );

      return result.rows[0] ? parseReferralProgram(result.rows[0].record) : undefined;
    },
    listPrograms: async (locationSlug?: string): Promise<ReferralProgram[]> => {
      const result = await db.query<{ record: ReferralProgram }>(
        `
          select record
          from growth_referral_program_projection
          where ($1::text is null or location_slug = $1)
          order by updated_at desc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseReferralProgram(row.record));
    },
    saveCode: async (code: ReferralCode): Promise<void> => {
      const scope = await resolveLocationScope(db, code.locationSlug);

      await db.query(
        `
          insert into growth_referral_code_projection (
            id,
            program_id,
            brand_id,
            location_id,
            location_slug,
            owner_user_id,
            owner_email,
            code,
            created_at,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
          )
          on conflict (id) do update
          set
            program_id = excluded.program_id,
            owner_user_id = excluded.owner_user_id,
            owner_email = excluded.owner_email,
            code = excluded.code,
            record = excluded.record
        `,
        [
          code.id,
          code.programId,
          scope.brand_id,
          scope.location_id,
          code.locationSlug,
          code.ownerUserId ?? null,
          code.ownerEmail,
          code.code,
          code.createdAt,
          JSON.stringify(code),
        ],
      );
    },
    listCodes: async (locationSlug?: string): Promise<ReferralCode[]> => {
      const result = await db.query<{ record: ReferralCode }>(
        `
          select record
          from growth_referral_code_projection
          where ($1::text is null or location_slug = $1)
          order by created_at desc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseReferralCode(row.record));
    },
    saveRelationship: async (relationship: ReferralRelationship): Promise<void> => {
      const scope = await resolveLocationScope(db, relationship.locationSlug);

      await db.query(
        `
          insert into growth_referral_relationship_projection (
            id,
            program_id,
            brand_id,
            location_id,
            location_slug,
            referral_code_id,
            referral_code,
            referrer_user_id,
            referrer_email,
            referee_user_id,
            referee_email,
            status,
            first_qualified_order_id,
            created_at,
            updated_at,
            qualified_at,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb
          )
          on conflict (id) do update
          set
            program_id = excluded.program_id,
            referral_code_id = excluded.referral_code_id,
            referral_code = excluded.referral_code,
            referrer_user_id = excluded.referrer_user_id,
            referrer_email = excluded.referrer_email,
            referee_user_id = excluded.referee_user_id,
            referee_email = excluded.referee_email,
            status = excluded.status,
            first_qualified_order_id = excluded.first_qualified_order_id,
            updated_at = excluded.updated_at,
            qualified_at = excluded.qualified_at,
            record = excluded.record
        `,
        [
          relationship.id,
          relationship.programId,
          scope.brand_id,
          scope.location_id,
          relationship.locationSlug,
          relationship.referralCodeId,
          relationship.referralCode,
          relationship.referrerUserId ?? null,
          relationship.referrerEmail,
          relationship.refereeUserId ?? null,
          relationship.refereeEmail,
          relationship.status,
          relationship.firstQualifiedOrderId ?? null,
          relationship.createdAt,
          relationship.updatedAt,
          relationship.qualifiedAt ?? null,
          JSON.stringify(relationship),
        ],
      );
    },
    listRelationships: async (locationSlug?: string): Promise<ReferralRelationship[]> => {
      const result = await db.query<{ record: ReferralRelationship }>(
        `
          select record
          from growth_referral_relationship_projection
          where ($1::text is null or location_slug = $1)
          order by created_at desc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseReferralRelationship(row.record));
    },
    saveRewardEvent: async (event: ReferralRewardEvent): Promise<void> => {
      const scope = await resolveLocationScope(db, event.locationSlug);

      await db.query(
        `
          insert into growth_referral_reward_event_projection (
            id,
            program_id,
            relationship_id,
            brand_id,
            location_id,
            location_slug,
            recipient,
            recipient_user_id,
            recipient_email,
            reward,
            source_order_id,
            status,
            credit_entry_id,
            created_at,
            reversed_at,
            record
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16::jsonb
          )
          on conflict (id) do update
          set
            program_id = excluded.program_id,
            relationship_id = excluded.relationship_id,
            recipient = excluded.recipient,
            recipient_user_id = excluded.recipient_user_id,
            recipient_email = excluded.recipient_email,
            reward = excluded.reward,
            source_order_id = excluded.source_order_id,
            status = excluded.status,
            credit_entry_id = excluded.credit_entry_id,
            reversed_at = excluded.reversed_at,
            record = excluded.record
        `,
        [
          event.id,
          event.programId,
          event.relationshipId,
          scope.brand_id,
          scope.location_id,
          event.locationSlug,
          event.recipient,
          event.recipientUserId ?? null,
          event.recipientEmail,
          JSON.stringify(event.reward),
          event.sourceOrderId ?? null,
          event.status,
          event.creditEntryId ?? null,
          event.createdAt,
          event.reversedAt ?? null,
          JSON.stringify(event),
        ],
      );
    },
    listRewardEvents: async (locationSlug?: string): Promise<ReferralRewardEvent[]> => {
      const result = await db.query<{ record: ReferralRewardEvent }>(
        `
          select record
          from growth_referral_reward_event_projection
          where ($1::text is null or location_slug = $1)
          order by created_at desc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseReferralRewardEvent(row.record));
    },
  },
});
