import type {
  AiRunRecord,
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
  saveSkinAssessmentIntake,
  saveSkinAssessmentRecord,
  saveTreatmentPlan,
  updateTreatmentPlan,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface ClinicalIntelligenceRepository {
  aiRuns: {
    save(run: AiRunRecord): Awaitable<void>;
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
