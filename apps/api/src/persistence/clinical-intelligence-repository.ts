import type {
  AiProvider,
  SkinAssessmentIntakeRecord,
  SkinAssessmentRecord,
  TreatmentPlanRecord,
} from "../../../../packages/domain/src";

import {
  findSkinAssessmentIntakeByEvent,
  getSkinAssessmentIntake,
  getSkinAssessmentRecord,
  getSkinAssessmentRecordByRawIntakeId,
  listSkinAssessmentRecords,
  getTreatmentPlan,
  listTreatmentPlans,
  saveAiRun,
  getAiRunById,
  saveSkinAssessmentIntake,
  saveSkinAssessmentRecord,
  saveTreatmentPlan,
  updateTreatmentPlan,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

type AiRunSaveInput = {
  id: string;
  task: string;
  locationSlug: string;
  provider: AiProvider;
  model: string;
  promptVersion: string;
  actorUserId?: string;
  status: "pending" | "running" | "completed" | "failed";
  sourceProvenance: Array<{
    id: string;
    kind: string;
    referenceId: string;
    title: string;
    freshness: "static" | "runtime";
  }>;
  evaluation: {
    groundingScore: number;
    recommendationCoverageScore: number;
    safetyFlags: string[];
    notes: string[];
  };
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  errorMessage?: string;
};

export interface ClinicalIntelligenceRepository {
  aiRuns: {
    save(run: AiRunSaveInput): Awaitable<void>;
    getById(id: string): Awaitable<{ id: string; status: "pending" | "running" | "completed" | "failed"; result?: unknown } | null>;
  };
  skinAssessments: {
    findIntakeByEvent(input: {
      locationSlug: string;
      sourceApp: string;
      eventId: string;
    }): Awaitable<SkinAssessmentIntakeRecord | undefined>;
    getIntake(intakeId: string): Awaitable<SkinAssessmentIntakeRecord | undefined>;
    getById(assessmentId: string): Awaitable<SkinAssessmentRecord | undefined>;
    getByRawIntakeId(rawIntakeId: string): Awaitable<SkinAssessmentRecord | undefined>;
    list(locationSlug?: string): Awaitable<SkinAssessmentRecord[]>;
    saveIntake(intake: SkinAssessmentIntakeRecord): Awaitable<void>;
    save(assessment: SkinAssessmentRecord): Awaitable<void>;
  };
  treatmentPlans: {
    get(treatmentPlanId: string): Awaitable<TreatmentPlanRecord | undefined>;
    list(locationSlug?: string): Awaitable<TreatmentPlanRecord[]>;
    save(treatmentPlan: TreatmentPlanRecord): Awaitable<void>;
    update(treatmentPlan: TreatmentPlanRecord): Awaitable<void>;
  };
}

export const createInMemoryClinicalIntelligenceRepository =
  (): ClinicalIntelligenceRepository => ({
    aiRuns: {
      save: (run) => {
        saveAiRun(run);
      },
      getById: (id) => getAiRunById(id),
    },
    skinAssessments: {
      findIntakeByEvent: findSkinAssessmentIntakeByEvent,
      getIntake: getSkinAssessmentIntake,
      getById: getSkinAssessmentRecord,
      getByRawIntakeId: getSkinAssessmentRecordByRawIntakeId,
      list: listSkinAssessmentRecords,
      saveIntake: (intake) => {
        saveSkinAssessmentIntake(intake);
      },
      save: (assessment) => {
        saveSkinAssessmentRecord(assessment);
      },
    },
    treatmentPlans: {
      get: getTreatmentPlan,
      list: listTreatmentPlans,
      save: (treatmentPlan) => {
        saveTreatmentPlan(treatmentPlan);
      },
      update: (treatmentPlan) => {
        updateTreatmentPlan(treatmentPlan);
      },
    },
  });
