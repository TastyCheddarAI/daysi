import type {
  AdminActionLogEntry,
  ImportJob,
  ImportMappingProfile,
  ProviderPayoutRun,
  ReconciliationIssue,
  SupportCase,
  SupportCaseEvent,
} from "../../../../packages/domain/src";

import {
  getImportJob,
  getImportMappingProfile,
  getProviderPayoutRun,
  getReconciliationIssue,
  getSupportCase,
  listAdminActionLogEntries,
  listCoveredOrderIdsForLocation,
  listImportJobs,
  listImportMappingProfiles,
  listProviderPayoutRuns,
  listReconciliationIssues,
  listSupportCaseEvents,
  listSupportCases,
  saveAdminActionLogEntry,
  saveImportJob,
  saveImportMappingProfile,
  saveProviderPayoutRun,
  saveReconciliationIssue,
  saveSupportCase,
  saveSupportCaseEvent,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface OperationsRepository {
  audit: {
    save(entry: AdminActionLogEntry): Awaitable<void>;
    listAll(): Awaitable<AdminActionLogEntry[]>;
  };
  support: {
    saveCase(supportCase: SupportCase): Awaitable<void>;
    getCase(supportCaseId: string): Awaitable<SupportCase | undefined>;
    listCases(): Awaitable<SupportCase[]>;
    saveEvent(event: SupportCaseEvent): Awaitable<void>;
    listEvents(supportCaseId: string): Awaitable<SupportCaseEvent[]>;
  };
  providerPayoutRuns: {
    save(payoutRun: ProviderPayoutRun): Awaitable<void>;
    get(payoutRunId: string): Awaitable<ProviderPayoutRun | undefined>;
    listAll(): Awaitable<ProviderPayoutRun[]>;
    listCoveredOrderIdsForLocation(locationSlug: string): Awaitable<string[]>;
  };
  imports: {
    saveJob(importJob: ImportJob): Awaitable<void>;
    getJob(importJobId: string): Awaitable<ImportJob | undefined>;
    listJobs(): Awaitable<ImportJob[]>;
    saveMappingProfile(profile: ImportMappingProfile): Awaitable<void>;
    getMappingProfile(profileId: string): Awaitable<ImportMappingProfile | undefined>;
    listMappingProfiles(locationSlug?: string): Awaitable<ImportMappingProfile[]>;
    saveReconciliationIssue(issue: ReconciliationIssue): Awaitable<void>;
    getReconciliationIssue(issueId: string): Awaitable<ReconciliationIssue | undefined>;
    listReconciliationIssues(importJobId?: string): Awaitable<ReconciliationIssue[]>;
  };
}

export const createInMemoryOperationsRepository = (): OperationsRepository => ({
  audit: {
    save: (entry) => {
      saveAdminActionLogEntry(entry);
    },
    listAll: listAdminActionLogEntries,
  },
  support: {
    saveCase: (supportCase) => {
      saveSupportCase(supportCase);
    },
    getCase: getSupportCase,
    listCases: listSupportCases,
    saveEvent: (event) => {
      saveSupportCaseEvent(event);
    },
    listEvents: listSupportCaseEvents,
  },
  providerPayoutRuns: {
    save: (payoutRun) => {
      saveProviderPayoutRun(payoutRun);
    },
    get: getProviderPayoutRun,
    listAll: listProviderPayoutRuns,
    listCoveredOrderIdsForLocation,
  },
  imports: {
    saveJob: (importJob) => {
      saveImportJob(importJob);
    },
    getJob: getImportJob,
    listJobs: listImportJobs,
    saveMappingProfile: (profile) => {
      saveImportMappingProfile(profile);
    },
    getMappingProfile: getImportMappingProfile,
    listMappingProfiles: listImportMappingProfiles,
    saveReconciliationIssue: (issue) => {
      saveReconciliationIssue(issue);
    },
    getReconciliationIssue,
    listReconciliationIssues,
  },
});
