import { randomUUID } from "node:crypto";

export type ImportSourceSystem =
  | "csv"
  | "manual"
  | "supabase"
  | "square"
  | "zenoti"
  | "boulevard"
  | "pabau"
  | "vagaro"
  | "other";

export type ImportEntityType =
  | "customers"
  | "services"
  | "memberships"
  | "bookings"
  | "balances"
  | "providers"
  | "products"
  | "machines";

export type ImportJobStatus = "queued" | "running" | "completed" | "failed";
export type ImportRowStatus = "queued" | "processed" | "failed" | "skipped";
export type ImportMappingProfileStatus = "draft" | "active" | "archived";
export type ReconciliationIssueSeverity = "warning" | "error";
export type ReconciliationIssueStatus = "open" | "resolved" | "ignored";

export interface ImportJobRow {
  rowNumber: number;
  externalId?: string;
  rawPayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown>;
  status: ImportRowStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportJobCounts {
  totalRows: number;
  processedRows: number;
  failedRows: number;
  skippedRows: number;
  queuedRows: number;
}

export interface ImportJob {
  id: string;
  locationSlug: string;
  sourceSystem: ImportSourceSystem;
  entityType: ImportEntityType;
  status: ImportJobStatus;
  fileName?: string;
  metadata: Record<string, unknown>;
  counts: ImportJobCounts;
  rows: ImportJobRow[];
  initiatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ImportMappingFieldRule {
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface ImportMappingProfile {
  id: string;
  locationSlug: string;
  sourceSystem: ImportSourceSystem;
  entityType: ImportEntityType;
  name: string;
  status: ImportMappingProfileStatus;
  fieldMappings: ImportMappingFieldRule[];
  createdAt: string;
  updatedAt: string;
  updatedByUserId?: string;
}

export interface ReconciliationIssue {
  id: string;
  importJobId: string;
  locationSlug: string;
  rowNumber: number;
  externalId?: string;
  issueCode: string;
  severity: ReconciliationIssueSeverity;
  status: ReconciliationIssueStatus;
  summary: string;
  detail?: string;
  rawPayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ImportJobRowInput {
  rowNumber: number;
  externalId?: string;
  rawPayload: Record<string, unknown>;
}

export interface ImportJobRowUpdate {
  rowNumber: number;
  status: ImportRowStatus;
  normalizedPayload?: Record<string, unknown>;
  errorMessage?: string;
}

export const createImportMappingProfile = (input: {
  locationSlug: string;
  sourceSystem: ImportSourceSystem;
  entityType: ImportEntityType;
  name: string;
  status?: ImportMappingProfileStatus;
  fieldMappings: ImportMappingFieldRule[];
  updatedByUserId?: string;
  now?: string;
}): ImportMappingProfile => {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `imap_${randomUUID()}`,
    locationSlug: input.locationSlug,
    sourceSystem: input.sourceSystem,
    entityType: input.entityType,
    name: input.name,
    status: input.status ?? "draft",
    fieldMappings: input.fieldMappings,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: input.updatedByUserId,
  };
};

export const updateImportMappingProfile = (input: {
  profile: ImportMappingProfile;
  name?: string;
  status?: ImportMappingProfileStatus;
  fieldMappings?: ImportMappingFieldRule[];
  updatedByUserId?: string;
  now?: string;
}): ImportMappingProfile => ({
  ...input.profile,
  name: input.name ?? input.profile.name,
  status: input.status ?? input.profile.status,
  fieldMappings: input.fieldMappings ?? input.profile.fieldMappings,
  updatedAt: input.now ?? new Date().toISOString(),
  updatedByUserId: input.updatedByUserId ?? input.profile.updatedByUserId,
});

const buildImportJobCounts = (rows: ImportJobRow[]): ImportJobCounts => ({
  totalRows: rows.length,
  processedRows: rows.filter((row) => row.status === "processed").length,
  failedRows: rows.filter((row) => row.status === "failed").length,
  skippedRows: rows.filter((row) => row.status === "skipped").length,
  queuedRows: rows.filter((row) => row.status === "queued").length,
});

export const createImportJob = (input: {
  locationSlug: string;
  sourceSystem: ImportSourceSystem;
  entityType: ImportEntityType;
  fileName?: string;
  metadata?: Record<string, unknown>;
  rows?: ImportJobRowInput[];
  initiatedByUserId?: string;
  now?: string;
}): ImportJob => {
  const now = input.now ?? new Date().toISOString();
  const duplicateRowNumber = (input.rows ?? []).find(
    (row, index, rows) => rows.findIndex((candidate) => candidate.rowNumber === row.rowNumber) !== index,
  )?.rowNumber;
  if (duplicateRowNumber !== undefined) {
    throw new Error(`Import row ${duplicateRowNumber} is duplicated.`);
  }
  const rows = (input.rows ?? [])
    .slice()
    .sort((left, right) => left.rowNumber - right.rowNumber)
    .map((row) => ({
      rowNumber: row.rowNumber,
      externalId: row.externalId,
      rawPayload: row.rawPayload,
      status: "queued" as const,
      createdAt: now,
      updatedAt: now,
    }));

  return {
    id: `ijob_${randomUUID()}`,
    locationSlug: input.locationSlug,
    sourceSystem: input.sourceSystem,
    entityType: input.entityType,
    status: "queued",
    fileName: input.fileName,
    metadata: input.metadata ?? {},
    counts: buildImportJobCounts(rows),
    rows,
    initiatedByUserId: input.initiatedByUserId,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateImportJob = (input: {
  job: ImportJob;
  status?: ImportJobStatus;
  metadata?: Record<string, unknown>;
  rowUpdates?: ImportJobRowUpdate[];
  errorMessage?: string;
  now?: string;
}): ImportJob => {
  const now = input.now ?? new Date().toISOString();
  const rowUpdatesByNumber = new Map(
    (input.rowUpdates ?? []).map((rowUpdate) => [rowUpdate.rowNumber, rowUpdate]),
  );

  const missingRow = [...rowUpdatesByNumber.keys()].find(
    (rowNumber) => !input.job.rows.some((row) => row.rowNumber === rowNumber),
  );
  if (missingRow !== undefined) {
    throw new Error(`Import row ${missingRow} was not found.`);
  }

  const rows = input.job.rows.map((row) => {
    const rowUpdate = rowUpdatesByNumber.get(row.rowNumber);
    if (!rowUpdate) {
      return row;
    }

    return {
      ...row,
      status: rowUpdate.status,
      normalizedPayload: rowUpdate.normalizedPayload ?? row.normalizedPayload,
      errorMessage: rowUpdate.errorMessage,
      updatedAt: now,
    };
  });
  const status = input.status ?? input.job.status;
  const completedAt =
    status === "completed" || status === "failed" ? input.job.completedAt ?? now : undefined;

  return {
    ...input.job,
    status,
    metadata: input.metadata ? { ...input.job.metadata, ...input.metadata } : input.job.metadata,
    counts: buildImportJobCounts(rows),
    rows,
    updatedAt: now,
    completedAt,
    errorMessage: input.errorMessage,
  };
};

export const buildImportJobReconciliationIssues = (
  job: ImportJob,
): ReconciliationIssue[] =>
  job.rows
    .filter(
      (row): row is ImportJobRow & { status: "failed" | "skipped" } =>
        row.status === "failed" || row.status === "skipped",
    )
    .map((row) => ({
      id: `rissue_${job.id}_${row.rowNumber}`,
      importJobId: job.id,
      locationSlug: job.locationSlug,
      rowNumber: row.rowNumber,
      externalId: row.externalId,
      issueCode: row.status === "failed" ? "row_failed" : "row_skipped",
      severity: row.status === "failed" ? "error" : "warning",
      status: "open",
      summary:
        row.status === "failed"
          ? `Import row ${row.rowNumber} failed validation`
          : `Import row ${row.rowNumber} was skipped`,
      detail: row.errorMessage,
      rawPayload: row.rawPayload,
      normalizedPayload: row.normalizedPayload,
      createdAt: row.updatedAt,
      updatedAt: row.updatedAt,
    }));

export const syncImportJobReconciliationIssues = (input: {
  job: ImportJob;
  existingIssues: ReconciliationIssue[];
  now?: string;
}): ReconciliationIssue[] => {
  const now = input.now ?? new Date().toISOString();
  const currentIssues = buildImportJobReconciliationIssues(input.job);
  const currentIssueByRowNumber = new Map(
    currentIssues.map((issue) => [issue.rowNumber, issue]),
  );

  const nextIssues = new Map<string, ReconciliationIssue>();

  for (const existingIssue of input.existingIssues) {
    const currentIssue = currentIssueByRowNumber.get(existingIssue.rowNumber);
    if (!currentIssue) {
      nextIssues.set(existingIssue.id, {
        ...existingIssue,
        status:
          existingIssue.status === "ignored" ? existingIssue.status : "resolved",
        updatedAt: now,
        resolvedAt:
          existingIssue.status === "ignored"
            ? existingIssue.resolvedAt
            : existingIssue.resolvedAt ?? now,
      });
      continue;
    }

    nextIssues.set(existingIssue.id, {
      ...existingIssue,
      externalId: currentIssue.externalId,
      issueCode: currentIssue.issueCode,
      severity: currentIssue.severity,
      summary: currentIssue.summary,
      detail: currentIssue.detail,
      rawPayload: currentIssue.rawPayload,
      normalizedPayload: currentIssue.normalizedPayload,
      updatedAt: now,
      resolvedAt: undefined,
      status: existingIssue.status === "ignored" ? "ignored" : "open",
    });
  }

  for (const currentIssue of currentIssues) {
    const existingIssue = input.existingIssues.find(
      (issue) => issue.rowNumber === currentIssue.rowNumber,
    );
    if (existingIssue) {
      continue;
    }

    nextIssues.set(currentIssue.id, {
      ...currentIssue,
      createdAt: now,
      updatedAt: now,
    });
  }

  return [...nextIssues.values()].sort((left, right) => left.rowNumber - right.rowNumber);
};

export const updateReconciliationIssue = (input: {
  issue: ReconciliationIssue;
  status: ReconciliationIssueStatus;
  now?: string;
}): ReconciliationIssue => ({
  ...input.issue,
  status: input.status,
  updatedAt: input.now ?? new Date().toISOString(),
  resolvedAt:
    input.status === "resolved" || input.status === "ignored"
      ? input.issue.resolvedAt ?? input.now ?? new Date().toISOString()
      : undefined,
});

export const retryImportJobRows = (input: {
  job: ImportJob;
  rowNumbers?: number[];
  now?: string;
}): ImportJob => {
  const eligibleRows = input.job.rows.filter(
    (row) =>
      (row.status === "failed" || row.status === "skipped") &&
      (!input.rowNumbers?.length || input.rowNumbers.includes(row.rowNumber)),
  );

  if (eligibleRows.length === 0) {
    throw new Error("No failed or skipped import rows were eligible for retry.");
  }

  return updateImportJob({
    job: input.job,
    status: "queued",
    errorMessage: undefined,
    rowUpdates: eligibleRows.map((row) => ({
      rowNumber: row.rowNumber,
      status: "queued",
      normalizedPayload: undefined,
      errorMessage: undefined,
    })),
    now: input.now,
  });
};
