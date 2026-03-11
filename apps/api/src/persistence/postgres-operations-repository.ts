import type { Pool } from "pg";

import type {
  AdminActionLogEntry,
  ImportJob,
  ImportMappingProfile,
  ProviderPayoutRun,
  ReconciliationIssue,
  SupportCase,
  SupportCaseEvent,
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
    throw new Error(`Location ${locationSlug} is not available in Postgres operations persistence.`);
  }

  if ((result.rowCount ?? 0) > 1) {
    throw new Error(`Location slug ${locationSlug} is ambiguous across brands.`);
  }

  return result.rows[0];
};

const parseAdminActionLogEntry = (value: unknown): AdminActionLogEntry =>
  value as AdminActionLogEntry;
const parseSupportCase = (value: unknown): SupportCase => value as SupportCase;
const parseSupportCaseEvent = (value: unknown): SupportCaseEvent => value as SupportCaseEvent;
const parseImportJob = (value: unknown): ImportJob => value as ImportJob;
const parseImportMappingProfile = (value: unknown): ImportMappingProfile =>
  value as ImportMappingProfile;
const parseProviderPayoutRun = (value: unknown): ProviderPayoutRun => value as ProviderPayoutRun;
const parseReconciliationIssue = (value: unknown): ReconciliationIssue =>
  value as ReconciliationIssue;

const saveAuditEntry = async (
  db: Queryable,
  entry: AdminActionLogEntry,
): Promise<void> => {
  const scope = entry.locationSlug ? await resolveLocationScope(db, entry.locationSlug) : undefined;

  await db.query(
    `
      insert into operations_admin_action_log_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        actor_user_id,
        actor_email,
        action,
        entity_type,
        entity_id,
        summary,
        metadata,
        occurred_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13::jsonb
      )
      on conflict (id) do update
      set
        brand_id = excluded.brand_id,
        location_id = excluded.location_id,
        location_slug = excluded.location_slug,
        actor_user_id = excluded.actor_user_id,
        actor_email = excluded.actor_email,
        action = excluded.action,
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        summary = excluded.summary,
        metadata = excluded.metadata,
        occurred_at = excluded.occurred_at,
        record = excluded.record
    `,
    [
      entry.id,
      scope?.brand_id ?? null,
      scope?.location_id ?? null,
      entry.locationSlug ?? null,
      entry.actorUserId ?? null,
      entry.actorEmail ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.summary,
      JSON.stringify(entry.metadata),
      entry.occurredAt,
      JSON.stringify(entry),
    ],
  );
};

const saveSupportCase = async (
  db: Queryable,
  supportCase: SupportCase,
): Promise<void> => {
  const scope = await resolveLocationScope(db, supportCase.locationSlug);

  await db.query(
    `
      insert into operations_support_case_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        subject,
        category,
        priority,
        status,
        opened_by_user_id,
        opened_by_email,
        assigned_to_user_id,
        tags,
        created_at,
        updated_at,
        resolved_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16::jsonb
      )
      on conflict (id) do update
      set
        subject = excluded.subject,
        category = excluded.category,
        priority = excluded.priority,
        status = excluded.status,
        opened_by_user_id = excluded.opened_by_user_id,
        opened_by_email = excluded.opened_by_email,
        assigned_to_user_id = excluded.assigned_to_user_id,
        tags = excluded.tags,
        updated_at = excluded.updated_at,
        resolved_at = excluded.resolved_at,
        record = excluded.record
    `,
    [
      supportCase.id,
      scope.brand_id,
      scope.location_id,
      supportCase.locationSlug,
      supportCase.subject,
      supportCase.category,
      supportCase.priority,
      supportCase.status,
      supportCase.openedByUserId ?? null,
      supportCase.openedByEmail ?? null,
      supportCase.assignedToUserId ?? null,
      JSON.stringify(supportCase.tags),
      supportCase.createdAt,
      supportCase.updatedAt,
      supportCase.resolvedAt ?? null,
      JSON.stringify(supportCase),
    ],
  );
};

const saveSupportCaseEvent = async (
  db: Queryable,
  event: SupportCaseEvent,
): Promise<void> => {
  const scope = await resolveLocationScope(db, event.locationSlug);

  await db.query(
    `
      insert into operations_support_case_event_projection (
        id,
        support_case_id,
        brand_id,
        location_id,
        location_slug,
        type,
        visibility,
        body,
        metadata,
        created_by_user_id,
        created_by_display_name,
        created_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::jsonb
      )
      on conflict (id) do update
      set
        support_case_id = excluded.support_case_id,
        type = excluded.type,
        visibility = excluded.visibility,
        body = excluded.body,
        metadata = excluded.metadata,
        created_by_user_id = excluded.created_by_user_id,
        created_by_display_name = excluded.created_by_display_name,
        created_at = excluded.created_at,
        record = excluded.record
    `,
    [
      event.id,
      event.supportCaseId,
      scope.brand_id,
      scope.location_id,
      event.locationSlug,
      event.type,
      event.visibility,
      event.body,
      JSON.stringify(event.metadata),
      event.createdByUserId ?? null,
      event.createdByDisplayName ?? null,
      event.createdAt,
      JSON.stringify(event),
    ],
  );
};

const saveImportJob = async (db: Queryable, importJob: ImportJob): Promise<void> => {
  const scope = await resolveLocationScope(db, importJob.locationSlug);

  await db.query(
    `
      insert into operations_import_job_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        source_system,
        entity_type,
        status,
        file_name,
        metadata,
        counts,
        rows,
        initiated_by_user_id,
        created_at,
        updated_at,
        completed_at,
        error_message,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $17::jsonb
      )
      on conflict (id) do update
      set
        source_system = excluded.source_system,
        entity_type = excluded.entity_type,
        status = excluded.status,
        file_name = excluded.file_name,
        metadata = excluded.metadata,
        counts = excluded.counts,
        rows = excluded.rows,
        initiated_by_user_id = excluded.initiated_by_user_id,
        updated_at = excluded.updated_at,
        completed_at = excluded.completed_at,
        error_message = excluded.error_message,
        record = excluded.record
    `,
    [
      importJob.id,
      scope.brand_id,
      scope.location_id,
      importJob.locationSlug,
      importJob.sourceSystem,
      importJob.entityType,
      importJob.status,
      importJob.fileName ?? null,
      JSON.stringify(importJob.metadata),
      JSON.stringify(importJob.counts),
      JSON.stringify(importJob.rows),
      importJob.initiatedByUserId ?? null,
      importJob.createdAt,
      importJob.updatedAt,
      importJob.completedAt ?? null,
      importJob.errorMessage ?? null,
      JSON.stringify(importJob),
    ],
  );
};

const saveImportMappingProfile = async (
  db: Queryable,
  profile: ImportMappingProfile,
): Promise<void> => {
  const scope = await resolveLocationScope(db, profile.locationSlug);

  await db.query(
    `
      insert into operations_import_mapping_profile_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        source_system,
        entity_type,
        name,
        status,
        field_mappings,
        updated_by_user_id,
        created_at,
        updated_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::jsonb
      )
      on conflict (id) do update
      set
        source_system = excluded.source_system,
        entity_type = excluded.entity_type,
        name = excluded.name,
        status = excluded.status,
        field_mappings = excluded.field_mappings,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = excluded.updated_at,
        record = excluded.record
    `,
    [
      profile.id,
      scope.brand_id,
      scope.location_id,
      profile.locationSlug,
      profile.sourceSystem,
      profile.entityType,
      profile.name,
      profile.status,
      JSON.stringify(profile.fieldMappings),
      profile.updatedByUserId ?? null,
      profile.createdAt,
      profile.updatedAt,
      JSON.stringify(profile),
    ],
  );
};

const saveProviderPayoutRun = async (
  db: Queryable,
  payoutRun: ProviderPayoutRun,
): Promise<void> => {
  const scope = await resolveLocationScope(db, payoutRun.locationSlug);

  await db.query(
    `
      insert into operations_provider_payout_run_projection (
        id,
        brand_id,
        location_id,
        location_slug,
        currency,
        status,
        from_date,
        to_date,
        provider_payouts,
        covered_order_ids,
        created_at,
        created_by_user_id,
        approved_at,
        paid_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15::jsonb
      )
      on conflict (id) do update
      set
        currency = excluded.currency,
        status = excluded.status,
        from_date = excluded.from_date,
        to_date = excluded.to_date,
        provider_payouts = excluded.provider_payouts,
        covered_order_ids = excluded.covered_order_ids,
        created_by_user_id = excluded.created_by_user_id,
        approved_at = excluded.approved_at,
        paid_at = excluded.paid_at,
        record = excluded.record
    `,
    [
      payoutRun.id,
      scope.brand_id,
      scope.location_id,
      payoutRun.locationSlug,
      payoutRun.currency,
      payoutRun.status,
      payoutRun.fromDate,
      payoutRun.toDate,
      JSON.stringify(payoutRun.providerPayouts),
      JSON.stringify(payoutRun.coveredOrderIds),
      payoutRun.createdAt,
      payoutRun.createdByUserId ?? null,
      payoutRun.approvedAt ?? null,
      payoutRun.paidAt ?? null,
      JSON.stringify(payoutRun),
    ],
  );
};

const saveReconciliationIssue = async (
  db: Queryable,
  issue: ReconciliationIssue,
): Promise<void> => {
  const scope = await resolveLocationScope(db, issue.locationSlug);

  await db.query(
    `
      insert into operations_reconciliation_issue_projection (
        id,
        import_job_id,
        brand_id,
        location_id,
        location_slug,
        row_number,
        external_id,
        issue_code,
        severity,
        status,
        summary,
        detail,
        raw_payload,
        normalized_payload,
        created_at,
        updated_at,
        resolved_at,
        record
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17, $18::jsonb
      )
      on conflict (id) do update
      set
        import_job_id = excluded.import_job_id,
        row_number = excluded.row_number,
        external_id = excluded.external_id,
        issue_code = excluded.issue_code,
        severity = excluded.severity,
        status = excluded.status,
        summary = excluded.summary,
        detail = excluded.detail,
        raw_payload = excluded.raw_payload,
        normalized_payload = excluded.normalized_payload,
        updated_at = excluded.updated_at,
        resolved_at = excluded.resolved_at,
        record = excluded.record
    `,
    [
      issue.id,
      issue.importJobId,
      scope.brand_id,
      scope.location_id,
      issue.locationSlug,
      issue.rowNumber,
      issue.externalId ?? null,
      issue.issueCode,
      issue.severity,
      issue.status,
      issue.summary,
      issue.detail ?? null,
      JSON.stringify(issue.rawPayload),
      JSON.stringify(issue.normalizedPayload ?? null),
      issue.createdAt,
      issue.updatedAt,
      issue.resolvedAt ?? null,
      JSON.stringify(issue),
    ],
  );
};

export const createPostgresOperationsRepository = (db: Queryable) => ({
  audit: {
    save: async (entry: AdminActionLogEntry): Promise<void> => {
      await saveAuditEntry(db, entry);
    },
    listAll: async (): Promise<AdminActionLogEntry[]> => {
      const result = await db.query<{ record: AdminActionLogEntry }>(
        `
          select record
          from operations_admin_action_log_projection
          order by occurred_at desc
        `,
      );

      return result.rows.map((row) => parseAdminActionLogEntry(row.record));
    },
  },
  support: {
    saveCase: async (supportCase: SupportCase): Promise<void> => {
      await saveSupportCase(db, supportCase);
    },
    getCase: async (supportCaseId: string): Promise<SupportCase | undefined> => {
      const result = await db.query<{ record: SupportCase }>(
        `
          select record
          from operations_support_case_projection
          where id = $1
          limit 1
        `,
        [supportCaseId],
      );

      return result.rows[0] ? parseSupportCase(result.rows[0].record) : undefined;
    },
    listCases: async (): Promise<SupportCase[]> => {
      const result = await db.query<{ record: SupportCase }>(
        `
          select record
          from operations_support_case_projection
          order by updated_at desc
        `,
      );

      return result.rows.map((row) => parseSupportCase(row.record));
    },
    saveEvent: async (event: SupportCaseEvent): Promise<void> => {
      await saveSupportCaseEvent(db, event);
    },
    listEvents: async (supportCaseId: string): Promise<SupportCaseEvent[]> => {
      const result = await db.query<{ record: SupportCaseEvent }>(
        `
          select record
          from operations_support_case_event_projection
          where support_case_id = $1
          order by created_at asc
        `,
        [supportCaseId],
      );

      return result.rows.map((row) => parseSupportCaseEvent(row.record));
    },
  },
  providerPayoutRuns: {
    save: async (payoutRun: ProviderPayoutRun): Promise<void> => {
      await saveProviderPayoutRun(db, payoutRun);
    },
    get: async (payoutRunId: string): Promise<ProviderPayoutRun | undefined> => {
      const result = await db.query<{ record: ProviderPayoutRun }>(
        `
          select record
          from operations_provider_payout_run_projection
          where id = $1
          limit 1
        `,
        [payoutRunId],
      );

      return result.rows[0] ? parseProviderPayoutRun(result.rows[0].record) : undefined;
    },
    listAll: async (): Promise<ProviderPayoutRun[]> => {
      const result = await db.query<{ record: ProviderPayoutRun }>(
        `
          select record
          from operations_provider_payout_run_projection
          order by created_at desc
        `,
      );

      return result.rows.map((row) => parseProviderPayoutRun(row.record));
    },
    listCoveredOrderIdsForLocation: async (locationSlug: string): Promise<string[]> => {
      const result = await db.query<{ covered_order_ids: string[] | null }>(
        `
          select covered_order_ids
          from operations_provider_payout_run_projection
          where location_slug = $1
        `,
        [locationSlug],
      );

      return [...new Set(result.rows.flatMap((row) => row.covered_order_ids ?? []))];
    },
  },
  imports: {
    saveJob: async (importJob: ImportJob): Promise<void> => {
      await saveImportJob(db, importJob);
    },
    getJob: async (importJobId: string): Promise<ImportJob | undefined> => {
      const result = await db.query<{ record: ImportJob }>(
        `
          select record
          from operations_import_job_projection
          where id = $1
          limit 1
        `,
        [importJobId],
      );

      return result.rows[0] ? parseImportJob(result.rows[0].record) : undefined;
    },
    listJobs: async (): Promise<ImportJob[]> => {
      const result = await db.query<{ record: ImportJob }>(
        `
          select record
          from operations_import_job_projection
          order by created_at desc
        `,
      );

      return result.rows.map((row) => parseImportJob(row.record));
    },
    saveMappingProfile: async (profile: ImportMappingProfile): Promise<void> => {
      await saveImportMappingProfile(db, profile);
    },
    getMappingProfile: async (
      profileId: string,
    ): Promise<ImportMappingProfile | undefined> => {
      const result = await db.query<{ record: ImportMappingProfile }>(
        `
          select record
          from operations_import_mapping_profile_projection
          where id = $1
          limit 1
        `,
        [profileId],
      );

      return result.rows[0]
        ? parseImportMappingProfile(result.rows[0].record)
        : undefined;
    },
    listMappingProfiles: async (locationSlug?: string): Promise<ImportMappingProfile[]> => {
      const result = await db.query<{ record: ImportMappingProfile }>(
        `
          select record
          from operations_import_mapping_profile_projection
          where ($1::text is null or location_slug = $1)
          order by name asc
        `,
        [locationSlug ?? null],
      );

      return result.rows.map((row) => parseImportMappingProfile(row.record));
    },
    saveReconciliationIssue: async (issue: ReconciliationIssue): Promise<void> => {
      await saveReconciliationIssue(db, issue);
    },
    getReconciliationIssue: async (
      issueId: string,
    ): Promise<ReconciliationIssue | undefined> => {
      const result = await db.query<{ record: ReconciliationIssue }>(
        `
          select record
          from operations_reconciliation_issue_projection
          where id = $1
          limit 1
        `,
        [issueId],
      );

      return result.rows[0]
        ? parseReconciliationIssue(result.rows[0].record)
        : undefined;
    },
    listReconciliationIssues: async (importJobId?: string): Promise<ReconciliationIssue[]> => {
      const result = await db.query<{ record: ReconciliationIssue }>(
        `
          select record
          from operations_reconciliation_issue_projection
          where ($1::text is null or import_job_id = $1)
          order by row_number asc
        `,
        [importJobId ?? null],
      );

      return result.rows.map((row) => parseReconciliationIssue(row.record));
    },
  },
});
