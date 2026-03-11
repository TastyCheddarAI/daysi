import type { Pool } from "pg";

import type {
  AiRunRecord,
  SkinAssessmentIntakeRecord,
  SkinAssessmentRecord,
  TreatmentPlanRecord,
} from "../../../../packages/domain/src";

import type { ClinicalIntelligenceRepository } from "./clinical-intelligence-repository";

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
    throw new Error(`Location ${locationSlug} is not available in Postgres persistence.`);
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const parseRecord = <T>(value: unknown): T => value as T;

export const createPostgresClinicalIntelligenceRepository = (
  db: Queryable,
): ClinicalIntelligenceRepository => ({
  aiRuns: {
    save: async (run) => {
      const scope = await resolveLocationScope(db, run.locationSlug);

      await db.query(
        `
          insert into clinical_ai_run (
            id,
            brand_id,
            location_id,
            location_slug,
            actor_user_id,
            task_key,
            provider_key,
            model_key,
            prompt_version,
            status,
            source_provenance,
            evaluation,
            record,
            created_at,
            completed_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15
          )
          on conflict (id) do update
          set
            actor_user_id = excluded.actor_user_id,
            provider_key = excluded.provider_key,
            model_key = excluded.model_key,
            prompt_version = excluded.prompt_version,
            status = excluded.status,
            source_provenance = excluded.source_provenance,
            evaluation = excluded.evaluation,
            record = excluded.record,
            created_at = excluded.created_at,
            completed_at = excluded.completed_at
        `,
        [
          run.id,
          scope.brand_id,
          scope.location_id,
          run.locationSlug,
          run.actorUserId ?? null,
          run.task,
          run.provider,
          run.model,
          run.promptVersion,
          run.status,
          JSON.stringify(run.sourceProvenance),
          JSON.stringify(run.evaluation),
          JSON.stringify(run),
          run.createdAt,
          run.completedAt,
        ],
      );
    },
  },
  skinAssessments: {
    findIntakeByEvent: async (input) => {
      const result = await db.query<{ record: SkinAssessmentIntakeRecord }>(
        `
          select record
          from clinical_skin_assessment_intake
          where location_slug = $1
            and source_app = $2
            and event_id = $3
          limit 1
        `,
        [input.locationSlug, input.sourceApp, input.eventId],
      );

      return result.rows[0] ? parseRecord<SkinAssessmentIntakeRecord>(result.rows[0].record) : undefined;
    },
    getIntake: async (intakeId) => {
      const result = await db.query<{ record: SkinAssessmentIntakeRecord }>(
        `
          select record
          from clinical_skin_assessment_intake
          where id = $1
          limit 1
        `,
        [intakeId],
      );

      return result.rows[0] ? parseRecord<SkinAssessmentIntakeRecord>(result.rows[0].record) : undefined;
    },
    getById: async (assessmentId) => {
      const result = await db.query<{ record: SkinAssessmentRecord }>(
        `
          select record
          from clinical_skin_assessment
          where id = $1
          limit 1
        `,
        [assessmentId],
      );

      return result.rows[0] ? parseRecord<SkinAssessmentRecord>(result.rows[0].record) : undefined;
    },
    getByRawIntakeId: async (rawIntakeId) => {
      const result = await db.query<{ record: SkinAssessmentRecord }>(
        `
          select record
          from clinical_skin_assessment
          where raw_intake_id = $1
          limit 1
        `,
        [rawIntakeId],
      );

      return result.rows[0] ? parseRecord<SkinAssessmentRecord>(result.rows[0].record) : undefined;
    },
    list: async (locationSlug) => {
      const result = await db.query<{ record: SkinAssessmentRecord }>(
        `
          select record
          from clinical_skin_assessment
          where ($1::text is null or location_slug = $1)
          order by captured_at desc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseRecord<SkinAssessmentRecord>(row.record));
    },
    saveIntake: async (intake) => {
      const scope = await resolveLocationScope(db, intake.locationSlug);

      await db.query(
        `
          insert into clinical_skin_assessment_intake (
            id,
            brand_id,
            location_id,
            location_slug,
            source_app,
            event_id,
            event_type,
            source_version,
            external_assessment_id,
            customer_email,
            customer_name,
            customer_external_id,
            signature_verified,
            signature_header,
            raw_payload,
            record,
            received_at,
            created_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb, $17, $18
          )
          on conflict (id) do update
          set
            source_version = excluded.source_version,
            customer_name = excluded.customer_name,
            customer_external_id = excluded.customer_external_id,
            signature_verified = excluded.signature_verified,
            signature_header = excluded.signature_header,
            raw_payload = excluded.raw_payload,
            record = excluded.record,
            received_at = excluded.received_at
        `,
        [
          intake.id,
          scope.brand_id,
          scope.location_id,
          intake.locationSlug,
          intake.sourceApp,
          intake.eventId,
          intake.eventType,
          intake.sourceVersion ?? null,
          intake.externalAssessmentId,
          intake.customerEmail,
          intake.customerName ?? null,
          intake.customerExternalId ?? null,
          intake.signatureVerified,
          intake.signatureHeader ?? null,
          JSON.stringify(intake.payload),
          JSON.stringify(intake),
          intake.receivedAt,
          intake.receivedAt,
        ],
      );
    },
    save: async (assessment) => {
      const scope = await resolveLocationScope(db, assessment.locationSlug);

      await db.query(
        `
          insert into clinical_skin_assessment (
            id,
            raw_intake_id,
            brand_id,
            location_id,
            location_slug,
            source_app,
            event_id,
            external_assessment_id,
            customer_email,
            customer_name,
            customer_external_id,
            analyzer_version,
            captured_at,
            received_at,
            summary,
            skin_type,
            fitzpatrick_type,
            confidence_score,
            dominant_concern_keys,
            concerns,
            treatment_goals,
            contraindications,
            recommended_service_slugs,
            unresolved_recommended_service_slugs,
            images,
            image_count,
            signals,
            record,
            created_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19::text[], $20::jsonb, $21::text[], $22::text[], $23::text[], $24::text[],
            $25::jsonb, $26, $27::jsonb, $28::jsonb, $29
          )
          on conflict (id) do update
          set
            summary = excluded.summary,
            analyzer_version = excluded.analyzer_version,
            skin_type = excluded.skin_type,
            fitzpatrick_type = excluded.fitzpatrick_type,
            confidence_score = excluded.confidence_score,
            dominant_concern_keys = excluded.dominant_concern_keys,
            concerns = excluded.concerns,
            treatment_goals = excluded.treatment_goals,
            contraindications = excluded.contraindications,
            recommended_service_slugs = excluded.recommended_service_slugs,
            unresolved_recommended_service_slugs = excluded.unresolved_recommended_service_slugs,
            images = excluded.images,
            image_count = excluded.image_count,
            signals = excluded.signals,
            record = excluded.record,
            captured_at = excluded.captured_at,
            received_at = excluded.received_at
        `,
        [
          assessment.id,
          assessment.rawIntakeId,
          scope.brand_id,
          scope.location_id,
          assessment.locationSlug,
          assessment.sourceApp,
          assessment.eventId,
          assessment.externalAssessmentId,
          assessment.customerEmail,
          assessment.customerName ?? null,
          assessment.customerExternalId ?? null,
          assessment.analyzerVersion ?? null,
          assessment.capturedAt,
          assessment.receivedAt,
          assessment.summary,
          assessment.skinType ?? null,
          assessment.fitzpatrickType ?? null,
          assessment.confidenceScore ?? null,
          assessment.dominantConcernKeys,
          JSON.stringify(assessment.concerns),
          assessment.treatmentGoals,
          assessment.contraindications,
          assessment.recommendedServiceSlugs,
          assessment.unresolvedRecommendedServiceSlugs,
          JSON.stringify(assessment.images),
          assessment.imageCount,
          JSON.stringify(assessment.signals),
          JSON.stringify(assessment),
          assessment.receivedAt,
        ],
      );
    },
  },
  treatmentPlans: {
    get: async (treatmentPlanId) => {
      const result = await db.query<{ record: TreatmentPlanRecord }>(
        `
          select record
          from clinical_treatment_plan
          where id = $1
          limit 1
        `,
        [treatmentPlanId],
      );

      return result.rows[0] ? parseRecord<TreatmentPlanRecord>(result.rows[0].record) : undefined;
    },
    list: async (locationSlug) => {
      const result = await db.query<{ record: TreatmentPlanRecord }>(
        `
          select record
          from clinical_treatment_plan
          where ($1::text is null or location_slug = $1)
          order by updated_at desc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseRecord<TreatmentPlanRecord>(row.record));
    },
    save: async (treatmentPlan) => {
      const scope = await resolveLocationScope(db, treatmentPlan.locationSlug);

      await db.query(
        `
          insert into clinical_treatment_plan (
            id,
            brand_id,
            location_id,
            location_slug,
            customer_email,
            customer_name,
            source_assessment_id,
            source_ai_run_id,
            status,
            summary,
            dominant_concern_keys,
            recommended_service_slugs,
            unresolved_recommended_service_slugs,
            membership_suggestion,
            next_actions,
            internal_notes,
            created_by_user_id,
            record,
            created_at,
            updated_at,
            shared_at,
            accepted_at,
            archived_at,
            archived_reason
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[], $12::text[], $13::text[],
            $14::jsonb, $15::text[], $16, $17, $18::jsonb, $19, $20, $21, $22, $23, $24
          )
          on conflict (id) do update
          set
            status = excluded.status,
            summary = excluded.summary,
            dominant_concern_keys = excluded.dominant_concern_keys,
            recommended_service_slugs = excluded.recommended_service_slugs,
            unresolved_recommended_service_slugs = excluded.unresolved_recommended_service_slugs,
            membership_suggestion = excluded.membership_suggestion,
            next_actions = excluded.next_actions,
            internal_notes = excluded.internal_notes,
            record = excluded.record,
            updated_at = excluded.updated_at,
            shared_at = excluded.shared_at,
            accepted_at = excluded.accepted_at,
            archived_at = excluded.archived_at,
            archived_reason = excluded.archived_reason
        `,
        [
          treatmentPlan.id,
          scope.brand_id,
          scope.location_id,
          treatmentPlan.locationSlug,
          treatmentPlan.customerEmail,
          treatmentPlan.customerName ?? null,
          treatmentPlan.sourceAssessmentId,
          treatmentPlan.sourceAiRunId,
          treatmentPlan.status,
          treatmentPlan.summary,
          treatmentPlan.dominantConcernKeys,
          treatmentPlan.recommendedServiceSlugs,
          treatmentPlan.unresolvedRecommendedServiceSlugs,
          JSON.stringify(treatmentPlan.membershipSuggestion ?? null),
          treatmentPlan.nextActions,
          treatmentPlan.internalNotes ?? null,
          treatmentPlan.createdByUserId ?? null,
          JSON.stringify(treatmentPlan),
          treatmentPlan.createdAt,
          treatmentPlan.updatedAt,
          treatmentPlan.sharedAt ?? null,
          treatmentPlan.acceptedAt ?? null,
          treatmentPlan.archivedAt ?? null,
          treatmentPlan.archivedReason ?? null,
        ],
      );
    },
    update: async (treatmentPlan) => {
      await db.query(
        `
          update clinical_treatment_plan
          set
            status = $2,
            summary = $3,
            dominant_concern_keys = $4::text[],
            recommended_service_slugs = $5::text[],
            unresolved_recommended_service_slugs = $6::text[],
            membership_suggestion = $7::jsonb,
            next_actions = $8::text[],
            internal_notes = $9,
            record = $10::jsonb,
            updated_at = $11,
            shared_at = $12,
            accepted_at = $13,
            archived_at = $14,
            archived_reason = $15
          where id = $1
        `,
        [
          treatmentPlan.id,
          treatmentPlan.status,
          treatmentPlan.summary,
          treatmentPlan.dominantConcernKeys,
          treatmentPlan.recommendedServiceSlugs,
          treatmentPlan.unresolvedRecommendedServiceSlugs,
          JSON.stringify(treatmentPlan.membershipSuggestion ?? null),
          treatmentPlan.nextActions,
          treatmentPlan.internalNotes ?? null,
          JSON.stringify(treatmentPlan),
          treatmentPlan.updatedAt,
          treatmentPlan.sharedAt ?? null,
          treatmentPlan.acceptedAt ?? null,
          treatmentPlan.archivedAt ?? null,
          treatmentPlan.archivedReason ?? null,
        ],
      );
    },
  },
});
