import { z } from "zod";

import { publicEducationOfferSummarySchema } from "./catalog";
import { locationSlugSchema, successEnvelope } from "./common";

const educationOfferPriceSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  amountCents: z.number().int().nonnegative(),
  isFree: z.boolean(),
});

// Education Module Content Types
export const lessonContentBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("heading"),
    level: z.number().int().min(1).max(6),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("list"),
    style: z.enum(["bullet", "numbered"]),
    items: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal("callout"),
    variant: z.enum(["info", "warning", "tip", "success"]),
    title: z.string().optional(),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("quiz"),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctOptionIndex: z.number().int().nonnegative(),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal("image"),
    url: z.string().min(1),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("video"),
    url: z.string().min(1),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal("audio"),
    url: z.string().min(1),
    title: z.string().optional(),
  }),
]);

export const educationLessonSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
  orderIndex: z.number().int().nonnegative(),
  content: z.array(lessonContentBlockSchema),
  aiGenerated: z.boolean().default(false),
  aiProvider: z.enum(["openai", "perplexity", "xai", "kimi"]).optional(),
  aiModel: z.string().optional(),
  aiPromptVersion: z.string().optional(),
  aiRunId: z.string().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  generatedAt: z.string().datetime({ offset: true }).optional(),
});

export const educationModuleSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  locationSlug: locationSlugSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().min(1),
  category: z.enum([
    "foundations",
    "technical",
    "business",
    "safety",
    "consulting",
    "marketing",
    "client_care",
    "advanced",
    "certification",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  estimatedDurationMinutes: z.number().int().positive(),
  learningObjectives: z.array(z.string().min(1)),
  lessons: z.array(educationLessonSchema),
  prerequisites: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  aiGenerated: z.boolean().default(false),
  aiProvider: z.enum(["openai", "perplexity", "xai", "kimi"]).optional(),
  aiModel: z.string().optional(),
  aiPromptVersion: z.string().optional(),
  aiRunId: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  authorName: z.string().optional(),
  authorTitle: z.string().optional(),
  certificationEligible: z.boolean().default(false),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  generatedAt: z.string().datetime({ offset: true }).optional(),
});

export const adminEducationModuleSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  locationSlug: locationSlugSchema,
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  category: educationModuleSchema.shape.category,
  difficulty: educationModuleSchema.shape.difficulty,
  estimatedDurationMinutes: z.number().int().positive(),
  lessonCount: z.number().int().nonnegative(),
  status: educationModuleSchema.shape.status,
  aiGenerated: z.boolean(),
  certificationEligible: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

// AI Content Generation
export const aiContentGenerationRequestSchema = z.object({
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
  provider: z.enum(["openai", "perplexity", "xai", "kimi"]).default("openai"),
  customPrompt: z.string().max(5000).optional(),
});

export const aiContentGenerationResponseSchema = successEnvelope(
  z.object({
    moduleId: z.string().min(1),
    slug: z.string().min(1),
    status: z.enum(["generating", "completed", "failed"]),
    provider: z.enum(["openai", "perplexity", "xai", "kimi"]),
    model: z.string(),
    estimatedCompletionTime: z.string().datetime({ offset: true }).optional(),
    aiRunId: z.string().min(1),
  }),
);

export const aiContentRegenerationRequestSchema = z.object({
  moduleSlug: z.string().min(1),
  locationSlug: locationSlugSchema,
  scope: z.enum(["full_module", "specific_lesson", "lesson_section"]),
  lessonSlug: z.string().optional(),
  sectionType: z.enum(["content", "quiz", "objectives", "all"]).optional(),
  customInstructions: z.string().max(2000).optional(),
  provider: z.enum(["openai", "perplexity", "xai", "kimi"]).optional(),
});

// Admin API Schemas
export const adminEducationOfferSchema = publicEducationOfferSummarySchema;

export const publicEducationCatalogResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    educationOffers: z.array(publicEducationOfferSummarySchema),
  }),
);

export const adminEducationOffersResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    educationOffers: z.array(adminEducationOfferSchema),
  }),
);

export const adminEducationOfferResponseSchema = successEnvelope(
  z.object({
    educationOffer: adminEducationOfferSchema,
  }),
);

export const adminEducationOfferCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  shortDescription: z.string().trim().min(1),
  moduleSlugs: z.array(z.string().trim().min(1)).min(1),
  membershipEligible: z.boolean().default(true),
  staffGrantEnabled: z.boolean().default(true),
  status: z.enum(["draft", "published"]).default("draft"),
  price: educationOfferPriceSchema,
});

export const adminEducationOfferUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    title: z.string().trim().min(1).optional(),
    shortDescription: z.string().trim().min(1).optional(),
    moduleSlugs: z.array(z.string().trim().min(1)).min(1).optional(),
    membershipEligible: z.boolean().optional(),
    staffGrantEnabled: z.boolean().optional(),
    status: z.enum(["draft", "published"]).optional(),
    price: educationOfferPriceSchema.optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.shortDescription !== undefined ||
      value.moduleSlugs !== undefined ||
      value.membershipEligible !== undefined ||
      value.staffGrantEnabled !== undefined ||
      value.status !== undefined ||
      value.price !== undefined,
    {
      message: "At least one education offer field must be updated.",
    },
  );

// Module Admin API Schemas
export const adminEducationModulesResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    modules: z.array(adminEducationModuleSummarySchema),
    stats: z.object({
      totalModules: z.number().int().nonnegative(),
      publishedModules: z.number().int().nonnegative(),
      aiGeneratedModules: z.number().int().nonnegative(),
      totalLessons: z.number().int().nonnegative(),
      byCategory: z.record(z.number().int().nonnegative()),
    }),
  }),
);

export const adminEducationModuleResponseSchema = successEnvelope(
  z.object({
    module: educationModuleSchema,
  }),
);

export const adminEducationModuleCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  shortDescription: z.string().trim().min(1).max(500),
  category: educationModuleSchema.shape.category,
  difficulty: educationModuleSchema.shape.difficulty,
  estimatedDurationMinutes: z.number().int().positive().max(480),
  learningObjectives: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
  prerequisites: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  certificationEligible: z.boolean().default(false),
  authorName: z.string().max(100).optional(),
  authorTitle: z.string().max(100).optional(),
});

export const adminEducationModuleUpdateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  shortDescription: z.string().trim().min(1).max(500).optional(),
  category: educationModuleSchema.shape.category.optional(),
  difficulty: educationModuleSchema.shape.difficulty.optional(),
  estimatedDurationMinutes: z.number().int().positive().max(480).optional(),
  learningObjectives: z.array(z.string().trim().min(1).max(500)).min(1).max(10).optional(),
  prerequisites: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  status: educationModuleSchema.shape.status.optional(),
  certificationEligible: z.boolean().optional(),
  authorName: z.string().max(100).optional(),
  authorTitle: z.string().max(100).optional(),
  lessons: z.array(educationLessonSchema).optional(),
});

export const adminEducationModuleLessonCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  moduleSlug: z.string().min(1),
  slug: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1000),
  durationMinutes: z.number().int().positive().max(120).optional(),
  orderIndex: z.number().int().nonnegative(),
  content: z.array(lessonContentBlockSchema).min(1),
});

export const adminEducationModuleLessonUpdateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  moduleSlug: z.string().min(1),
  lessonSlug: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(1000).optional(),
  durationMinutes: z.number().int().positive().max(120).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  content: z.array(lessonContentBlockSchema).optional(),
});

// Export types
export type LessonContentBlock = z.infer<typeof lessonContentBlockSchema>;
export type EducationLesson = z.infer<typeof educationLessonSchema>;
export type EducationModule = z.infer<typeof educationModuleSchema>;
export type AdminEducationModuleSummary = z.infer<typeof adminEducationModuleSummarySchema>;
export type AiContentGenerationRequest = z.infer<typeof aiContentGenerationRequestSchema>;
export type AiContentRegenerationRequest = z.infer<typeof aiContentRegenerationRequestSchema>;
