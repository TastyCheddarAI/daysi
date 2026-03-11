import { z } from "zod";

import { educationLessonSchema, educationModuleSchema } from "./education";
import { locationSlugSchema, successEnvelope } from "./common";

export const aiProviderSchema = z.enum([
  "openai",
  "perplexity",
  "xai",
  "kimi",
  "dataforseo",
]);

export const aiTaskSchema = z.enum([
  "assistant.booking_chat",
  "assistant.booking_recommendations",
  "assistant.assessment_follow_up",
  "education.content_generation",
  "education.content_regeneration",
  "education.lesson_expansion",
]);

export const aiSourceProvenanceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "internal_catalog",
    "internal_memberships",
    "internal_skin_assessment",
    "policy",
    "external_reference",
    "generated_content",
  ]),
  referenceId: z.string().min(1),
  title: z.string().min(1),
  freshness: z.enum(["static", "runtime"]),
});

export const aiEvaluationSchema = z.object({
  groundingScore: z.number().int().min(0).max(100),
  recommendationCoverageScore: z.number().int().min(0).max(100),
  safetyFlags: z.array(z.string()),
  notes: z.array(z.string()),
});

export const aiRunSchema = z.object({
  id: z.string().min(1),
  task: aiTaskSchema,
  locationSlug: locationSlugSchema,
  provider: aiProviderSchema,
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  actorUserId: z.string().min(1).optional(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  sourceProvenance: z.array(aiSourceProvenanceSchema),
  evaluation: aiEvaluationSchema,
  createdAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).optional(),
  failedAt: z.string().datetime({ offset: true }).optional(),
  errorMessage: z.string().optional(),
});

// Education AI Content Generation
export const educationContentGenerationRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  topic: z.string().trim().min(1).max(500),
  category: educationModuleSchema.shape.category,
  difficulty: educationModuleSchema.shape.difficulty,
  targetAudience: z.enum(["staff", "clients", "general"]).default("staff"),
  lessonCount: z.number().int().min(1).max(20).default(5),
  includeQuizzes: z.boolean().default(true),
  includeVisuals: z.boolean().default(true),
  keyLearningObjectives: z.array(z.string().trim().min(1)).max(10).default([]),
  referenceMaterials: z.array(z.string().trim().min(1)).max(5).optional(),
  tone: z.enum(["professional", "conversational", "academic", "friendly"]).default("professional"),
  provider: aiProviderSchema.default("openai"),
  customPrompt: z.string().max(5000).optional(),
});

export const educationContentGenerationResultSchema = z.object({
  module: educationModuleSchema,
  generationMetadata: z.object({
    promptTokens: z.number().int().nonnegative().optional(),
    completionTokens: z.number().int().nonnegative().optional(),
    totalTokens: z.number().int().nonnegative().optional(),
    generationTimeMs: z.number().int().nonnegative(),
    provider: aiProviderSchema,
    model: z.string(),
  }),
});

export const educationContentGenerationResponseSchema = successEnvelope(
  z.object({
    run: aiRunSchema,
    result: educationContentGenerationResultSchema.optional(),
    estimatedTokens: z.number().int().nonnegative().optional(),
  }),
);

export const educationContentRegenerationRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  moduleSlug: z.string().min(1),
  scope: z.enum(["full_module", "specific_lesson", "lesson_section"]),
  lessonSlug: z.string().optional(),
  sectionType: z.enum(["content", "quiz", "objectives", "all"]).optional(),
  customInstructions: z.string().max(2000).optional(),
  provider: aiProviderSchema.optional(),
  preserveUserEdits: z.boolean().default(true),
});

export const bookingAssistantChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1),
});

export const bookingAssistantChatRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  messages: z.array(bookingAssistantChatMessageSchema).min(1),
});

export const bookingAssistantChatResponseSchema = successEnvelope(
  z.object({
    run: aiRunSchema,
    answer: z.object({
      message: z.string().min(1),
      suggestedServiceSlugs: z.array(z.string().min(1)),
      suggestedMembershipPlanSlugs: z.array(z.string().min(1)),
      nextActions: z.array(z.string().min(1)),
    }),
  }),
);

export const bookingAssistantRecommendationsRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  concern: z.string().trim().min(1),
  budgetAmountCents: z.number().int().positive().optional(),
  prefersMembership: z.boolean().optional(),
});

export const bookingAssistantRecommendationSchema = z.object({
  serviceSlug: z.string().min(1),
  serviceName: z.string().min(1),
  reason: z.string().min(1),
  retailAmountCents: z.number().int().nonnegative(),
  memberAmountCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
});

export const bookingAssistantRecommendationsResponseSchema = successEnvelope(
  z.object({
    run: aiRunSchema,
    recommendations: z.array(bookingAssistantRecommendationSchema),
    membershipSuggestion: z
      .object({
        planSlug: z.string().min(1),
        reason: z.string().min(1),
      })
      .optional(),
    bookingSuggestion: z.object({
      locationSlug: locationSlugSchema,
      recommendedAction: z.string().min(1),
    }),
  }),
);

export const bookingAssistantAssessmentFollowUpRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  assessmentId: z.string().trim().min(1).optional(),
  customerEmail: z.string().email().optional(),
  prefersMembership: z.boolean().optional(),
});

export const bookingAssistantAssessmentFollowUpResponseSchema = successEnvelope(
  z.object({
    run: aiRunSchema,
    assessment: z.object({
      assessmentId: z.string().min(1),
      capturedAt: z.string().datetime({ offset: true }),
      summary: z.string().min(1),
      dominantConcernKeys: z.array(z.string().min(1)),
      recommendedServiceSlugs: z.array(z.string().min(1)),
      unresolvedRecommendedServiceSlugs: z.array(z.string().min(1)),
    }),
    recommendations: z.array(bookingAssistantRecommendationSchema),
    membershipSuggestion: z
      .object({
        planSlug: z.string().min(1),
        reason: z.string().min(1),
      })
      .optional(),
    followUpPlan: z.object({
      recommendedAction: z.string().min(1),
      nextActions: z.array(z.string().min(1)),
    }),
  }),
);

// Export types
export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiTask = z.infer<typeof aiTaskSchema>;
export type AiRun = z.infer<typeof aiRunSchema>;
export type AiSourceProvenance = z.infer<typeof aiSourceProvenanceSchema>;
export type AiEvaluation = z.infer<typeof aiEvaluationSchema>;
export type EducationContentGenerationRequest = z.infer<typeof educationContentGenerationRequestSchema>;
export type EducationContentGenerationResult = z.infer<typeof educationContentGenerationResultSchema>;
export type EducationContentRegenerationRequest = z.infer<typeof educationContentRegenerationRequestSchema>;
