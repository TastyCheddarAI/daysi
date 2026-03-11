import { describe, expect, it } from "vitest";

import {
  createImportMappingProfile,
  buildImportJobReconciliationIssues,
  createImportJob,
  retryImportJobRows,
  syncImportJobReconciliationIssues,
  updateImportMappingProfile,
  updateReconciliationIssue,
  updateImportJob,
} from "./imports";

describe("imports", () => {
  it("creates jobs and recalculates row counts on update", () => {
    const job = createImportJob({
      locationSlug: "daysi-flagship",
      sourceSystem: "csv",
      entityType: "customers",
      rows: [
        {
          rowNumber: 1,
          externalId: "cust_1",
          rawPayload: {
            email: "one@example.com",
          },
        },
        {
          rowNumber: 2,
          externalId: "cust_2",
          rawPayload: {
            email: "two@example.com",
          },
        },
      ],
      now: "2026-03-08T12:00:00.000Z",
    });

    expect(job.status).toBe("queued");
    expect(job.counts.totalRows).toBe(2);
    expect(job.counts.queuedRows).toBe(2);

    const updated = updateImportJob({
      job,
      status: "completed",
      rowUpdates: [
        {
          rowNumber: 1,
          status: "processed",
          normalizedPayload: {
            customerEmail: "one@example.com",
          },
        },
        {
          rowNumber: 2,
          status: "failed",
          errorMessage: "Missing consent status",
        },
      ],
      now: "2026-03-08T12:10:00.000Z",
    });

    expect(updated.status).toBe("completed");
    expect(updated.completedAt).toBe("2026-03-08T12:10:00.000Z");
    expect(updated.counts.processedRows).toBe(1);
    expect(updated.counts.failedRows).toBe(1);
    expect(updated.counts.queuedRows).toBe(0);
    expect(updated.rows[1]?.errorMessage).toBe("Missing consent status");
  });

  it("builds reconciliation issues and retries failed rows", () => {
    const job = updateImportJob({
      job: createImportJob({
        locationSlug: "daysi-flagship",
        sourceSystem: "csv",
        entityType: "services",
        rows: [
          {
            rowNumber: 1,
            externalId: "svc_1",
            rawPayload: {
              slug: "laser-hair-removal",
            },
          },
          {
            rowNumber: 2,
            externalId: "svc_2",
            rawPayload: {
              slug: "skin-rejuvenation",
            },
          },
        ],
        now: "2026-03-08T13:00:00.000Z",
      }),
      status: "failed",
      rowUpdates: [
        {
          rowNumber: 1,
          status: "processed",
        },
        {
          rowNumber: 2,
          status: "failed",
          errorMessage: "Machine capability missing",
        },
      ],
      now: "2026-03-08T13:05:00.000Z",
    });

    const issues = buildImportJobReconciliationIssues(job);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.rowNumber).toBe(2);
    expect(issues[0]?.detail).toBe("Machine capability missing");

    const retried = retryImportJobRows({
      job,
      rowNumbers: [2],
      now: "2026-03-08T13:10:00.000Z",
    });

    expect(retried.status).toBe("queued");
    expect(retried.counts.failedRows).toBe(0);
    expect(retried.counts.queuedRows).toBe(1);
    expect(retried.rows[1]?.status).toBe("queued");
    expect(retried.rows[1]?.errorMessage).toBeUndefined();
  });

  it("updates mapping profiles and synchronizes reconciliation issue lifecycle", () => {
    const profile = createImportMappingProfile({
      locationSlug: "daysi-flagship",
      sourceSystem: "csv",
      entityType: "customers",
      name: "Customer CSV v1",
      fieldMappings: [
        {
          sourceField: "Email Address",
          targetField: "customer.email",
        },
      ],
      updatedByUserId: "usr_admin_1",
      now: "2026-03-08T16:00:00.000Z",
    });

    const updatedProfile = updateImportMappingProfile({
      profile,
      status: "active",
      fieldMappings: [
        {
          sourceField: "Email Address",
          targetField: "customer.email",
          transform: "lowercase",
        },
      ],
      updatedByUserId: "usr_admin_2",
      now: "2026-03-08T16:05:00.000Z",
    });

    expect(updatedProfile.status).toBe("active");
    expect(updatedProfile.fieldMappings[0]?.transform).toBe("lowercase");

    const failedJob = updateImportJob({
      job: createImportJob({
        locationSlug: "daysi-flagship",
        sourceSystem: "csv",
        entityType: "customers",
        rows: [
          {
            rowNumber: 1,
            externalId: "cust_1",
            rawPayload: {
              email: "bad@example.com",
            },
          },
        ],
        now: "2026-03-08T16:10:00.000Z",
      }),
      status: "failed",
      rowUpdates: [
        {
          rowNumber: 1,
          status: "failed",
          errorMessage: "Missing phone number",
        },
      ],
      now: "2026-03-08T16:15:00.000Z",
    });

    const openIssues = syncImportJobReconciliationIssues({
      job: failedJob,
      existingIssues: [],
      now: "2026-03-08T16:16:00.000Z",
    });

    expect(openIssues).toHaveLength(1);
    expect(openIssues[0]?.status).toBe("open");

    const ignoredIssue = updateReconciliationIssue({
      issue: openIssues[0]!,
      status: "ignored",
      now: "2026-03-08T16:17:00.000Z",
    });

    expect(ignoredIssue.status).toBe("ignored");

    const resolvedIssues = syncImportJobReconciliationIssues({
      job: retryImportJobRows({
        job: failedJob,
        rowNumbers: [1],
        now: "2026-03-08T16:18:00.000Z",
      }),
      existingIssues: [ignoredIssue],
      now: "2026-03-08T16:19:00.000Z",
    });

    expect(resolvedIssues[0]?.status).toBe("ignored");
    expect(resolvedIssues[0]?.resolvedAt).toBe("2026-03-08T16:17:00.000Z");
  });
});
