import { randomUUID } from "node:crypto";

import type {
  AiProvider,
  EducationLesson,
  EducationModule,
  LessonContentBlock,
} from "../../contracts/src";

export type {
  EducationLesson,
  EducationModule,
  LessonContentBlock,
} from "../../contracts/src";

export interface EducationModuleRepository {
  list: (locationSlug: string) => Promise<EducationModule[]>;
  getBySlug: (locationSlug: string, slug: string) => Promise<EducationModule | null>;
  save: (module: EducationModule) => Promise<EducationModule>;
  delete: (locationSlug: string, slug: string) => Promise<boolean>;
}

export interface AiRunRepository {
  save: (run: {
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
  }) => Promise<void>;
  getById: (id: string) => Promise<{
    id: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: unknown;
  } | null>;
}

export type EducationModuleCategory =
  | "foundations"
  | "technical"
  | "business"
  | "safety"
  | "consulting"
  | "marketing"
  | "client_care"
  | "advanced"
  | "certification";

export type EducationModuleDifficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type EducationModuleStatus = "draft" | "in_review" | "published" | "archived";

export interface CreateEducationModuleInput {
  slug: string;
  locationSlug: string;
  title: string;
  description: string;
  shortDescription: string;
  category: EducationModuleCategory;
  difficulty: EducationModuleDifficulty;
  estimatedDurationMinutes: number;
  learningObjectives: string[];
  prerequisites?: string[];
  tags?: string[];
  certificationEligible?: boolean;
  authorName?: string;
  authorTitle?: string;
  now?: string;
}

export interface CreateEducationLessonInput {
  slug: string;
  title: string;
  description: string;
  durationMinutes?: number;
  orderIndex: number;
  content: LessonContentBlock[];
  aiGenerated?: boolean;
  aiProvider?: AiProvider;
  aiModel?: string;
  aiPromptVersion?: string;
  aiRunId?: string;
  now?: string;
}

export const createEducationModule = (input: CreateEducationModuleInput): EducationModule => {
  const now = input.now ?? new Date().toISOString();
  const normalizedSlug = normalizeModuleSlug(input.slug);

  return {
    id: `mod_${randomUUID()}`,
    slug: normalizedSlug,
    locationSlug: input.locationSlug,
    title: input.title.trim(),
    description: input.description.trim(),
    shortDescription: input.shortDescription.trim(),
    category: input.category,
    difficulty: input.difficulty,
    estimatedDurationMinutes: input.estimatedDurationMinutes,
    learningObjectives: input.learningObjectives.map((obj) => obj.trim()),
    lessons: [],
    prerequisites: input.prerequisites?.map((p) => p.trim()) ?? [],
    tags: input.tags?.map((t) => t.trim().toLowerCase()) ?? [],
    status: "draft",
    aiGenerated: false,
    certificationEligible: input.certificationEligible ?? false,
    authorName: input.authorName,
    authorTitle: input.authorTitle,
    createdAt: now,
    updatedAt: now,
  };
};

export const createEducationLesson = (input: CreateEducationLessonInput): EducationLesson => {
  const now = input.now ?? new Date().toISOString();
  const normalizedSlug = normalizeModuleSlug(input.slug);

  return {
    id: `les_${randomUUID()}`,
    slug: normalizedSlug,
    title: input.title.trim(),
    description: input.description.trim(),
    durationMinutes: input.durationMinutes,
    orderIndex: input.orderIndex,
    content: input.content,
    aiGenerated: input.aiGenerated ?? false,
    aiProvider: input.aiProvider,
    aiModel: input.aiModel,
    aiPromptVersion: input.aiPromptVersion,
    aiRunId: input.aiRunId,
    createdAt: now,
    updatedAt: now,
    generatedAt: input.aiGenerated ? now : undefined,
  };
};

export const addLessonToModule = (
  module: EducationModule,
  lesson: EducationLesson,
  now = new Date().toISOString(),
): EducationModule => ({
  ...module,
  lessons: [...module.lessons, { ...lesson, orderIndex: module.lessons.length }],
  updatedAt: now,
});

export const updateLessonInModule = (
  module: EducationModule,
  lessonSlug: string,
  updates: Partial<Omit<EducationLesson, "id" | "slug" | "createdAt">>,
  now = new Date().toISOString(),
): EducationModule => ({
  ...module,
  lessons: module.lessons.map((lesson) =>
    lesson.slug === lessonSlug
      ? {
          ...lesson,
          ...updates,
          updatedAt: now,
        }
      : lesson,
  ),
  updatedAt: now,
});

export const removeLessonFromModule = (
  module: EducationModule,
  lessonSlug: string,
  now = new Date().toISOString(),
): EducationModule => ({
  ...module,
  lessons: module.lessons
    .filter((lesson) => lesson.slug !== lessonSlug)
    .map((lesson, index) => ({ ...lesson, orderIndex: index })),
  updatedAt: now,
});

export const reorderLessons = (
  module: EducationModule,
  newOrder: string[], // array of lesson slugs
  now = new Date().toISOString(),
): EducationModule => {
  const lessonMap = new Map(module.lessons.map((l) => [l.slug, l]));
  const reorderedLessons = newOrder
    .map((slug) => lessonMap.get(slug))
    .filter((lesson): lesson is EducationLesson => lesson !== undefined);

  // Add any lessons not in the new order at the end
  const missingLessons = module.lessons.filter((l) => !newOrder.includes(l.slug));
  const allLessons = [...reorderedLessons, ...missingLessons];

  return {
    ...module,
    lessons: allLessons.map((lesson, index) => ({ ...lesson, orderIndex: index })),
    updatedAt: now,
  };
};

export const publishModule = (
  module: EducationModule,
  now = new Date().toISOString(),
): EducationModule => ({
  ...module,
  status: "published",
  publishedAt: now,
  updatedAt: now,
});

export const archiveModule = (
  module: EducationModule,
  now = new Date().toISOString(),
): EducationModule => ({
  ...module,
  status: "archived",
  updatedAt: now,
});

export const updateModule = (
  module: EducationModule,
  updates: Partial<
    Omit<EducationModule, "id" | "slug" | "locationSlug" | "createdAt" | "lessons">
  >,
  now = new Date().toISOString(),
): EducationModule => ({
  ...module,
  ...updates,
  updatedAt: now,
});

export const calculateModuleStats = (modules: EducationModule[]) => {
  const totalModules = modules.length;
  const publishedModules = modules.filter((m) => m.status === "published").length;
  const aiGeneratedModules = modules.filter((m) => m.aiGenerated).length;
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  const byCategory: Record<string, number> = {};
  for (const module of modules) {
    byCategory[module.category] = (byCategory[module.category] ?? 0) + 1;
  }

  return {
    totalModules,
    publishedModules,
    aiGeneratedModules,
    totalLessons,
    byCategory,
  };
};

export const listModulesByCategory = (
  modules: EducationModule[],
  category: EducationModuleCategory,
): EducationModule[] => modules.filter((m) => m.category === category);

export const listModulesByDifficulty = (
  modules: EducationModule[],
  difficulty: EducationModuleDifficulty,
): EducationModule[] => modules.filter((m) => m.difficulty === difficulty);

export const searchModules = (modules: EducationModule[], query: string): EducationModule[] => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return modules;

  return modules.filter(
    (m) =>
      m.title.toLowerCase().includes(normalizedQuery) ||
      m.description.toLowerCase().includes(normalizedQuery) ||
      m.tags.some((tag) => tag.includes(normalizedQuery)) ||
      m.learningObjectives.some((obj) => obj.toLowerCase().includes(normalizedQuery)),
  );
};

export const getLessonBySlug = (
  module: EducationModule,
  lessonSlug: string,
): EducationLesson | undefined => module.lessons.find((l) => l.slug === lessonSlug);

export const normalizeModuleSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error("Module slug is invalid.");
  }

  return normalized;
};

// AI Content Generation
export interface GenerateModuleContentInput {
  topic: string;
  category: EducationModuleCategory;
  difficulty: EducationModuleDifficulty;
  targetAudience: "staff" | "clients" | "general";
  lessonCount: number;
  includeQuizzes: boolean;
  includeVisuals: boolean;
  keyLearningObjectives: string[];
  referenceMaterials?: string[];
  tone: "professional" | "conversational" | "academic" | "friendly";
  locationSlug: string;
  actorUserId?: string;
  now?: string;
  // SEO grounding — enriches AI prompt with keyword context for organic search targeting
  keywordGrounding?: {
    primaryKeyword: string;
    supportingKeywords: string[];
    targetSearchVolume: number;
  };
  // Social trend grounding — when a viral topic triggered this module creation
  socialTrendGrounding?: {
    trendingTopic: string;
    platform: string;
    sentimentContext: string;
  };
}

export interface AiGeneratedModuleContent {
  title: string;
  description: string;
  shortDescription: string;
  estimatedDurationMinutes: number;
  learningObjectives: string[];
  lessons: Array<{
    slug: string;
    title: string;
    description: string;
    durationMinutes: number;
    content: LessonContentBlock[];
  }>;
  prerequisites: string[];
  tags: string[];
}

export const generateSlugFromTitle = (title: string): string => {
  const timestamp = Date.now().toString(36).slice(-4);
  const baseSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${baseSlug}-${timestamp}`;
};

export const buildAiGeneratedModule = (input: {
  content: AiGeneratedModuleContent;
  locationSlug: string;
  provider: AiProvider;
  model: string;
  aiRunId: string;
  actorUserId?: string;
  now?: string;
}): EducationModule => {
  const now = input.now ?? new Date().toISOString();
  const moduleSlug = generateSlugFromTitle(input.content.title);

  const lessons: EducationLesson[] = input.content.lessons.map((lessonInput, index) =>
    createEducationLesson({
      slug: lessonInput.slug,
      title: lessonInput.title,
      description: lessonInput.description,
      durationMinutes: lessonInput.durationMinutes,
      orderIndex: index,
      content: lessonInput.content,
      aiGenerated: true,
      aiProvider: input.provider,
      aiModel: input.model,
      aiPromptVersion: "edu-gen-v1",
      aiRunId: input.aiRunId,
      now,
    }),
  );

  return {
    id: `mod_${randomUUID()}`,
    slug: moduleSlug,
    locationSlug: input.locationSlug,
    title: input.content.title,
    description: input.content.description,
    shortDescription: input.content.shortDescription,
    category: "foundations", // Default, should be provided in input
    difficulty: "beginner", // Default, should be provided in input
    estimatedDurationMinutes: input.content.estimatedDurationMinutes,
    learningObjectives: input.content.learningObjectives,
    lessons,
    prerequisites: input.content.prerequisites,
    tags: input.content.tags,
    status: "draft",
    aiGenerated: true,
    aiProvider: input.provider,
    aiModel: input.model,
    aiPromptVersion: "edu-gen-v1",
    aiRunId: input.aiRunId,
    certificationEligible: false,
    createdAt: now,
    updatedAt: now,
    generatedAt: now,
  };
};

// AI Prompt Builders
export const buildModuleGenerationPrompt = (input: GenerateModuleContentInput): string => {
  const objectivesSection =
    input.keyLearningObjectives.length > 0
      ? `Key Learning Objectives:\n${input.keyLearningObjectives.map((obj) => `- ${obj}`).join("\n")}\n\n`
      : "";

  const referenceSection =
    input.referenceMaterials && input.referenceMaterials.length > 0
      ? `Reference Materials:\n${input.referenceMaterials.map((ref) => `- ${ref}`).join("\n")}\n\n`
      : "";

  const quizInstruction = input.includeQuizzes
    ? "Each lesson should include an interactive quiz section with 2-4 multiple choice questions to reinforce learning.\n"
    : "";

  const visualInstruction = input.includeVisuals
    ? "Include descriptions of visual aids, diagrams, or images where appropriate (marked with [IMAGE: description]).\n"
    : "";

  const seoSection = input.keywordGrounding
    ? `SEO Grounding (important — write naturally but optimise for search):
- Primary keyword: "${input.keywordGrounding.primaryKeyword}" (${input.keywordGrounding.targetSearchVolume.toLocaleString()} searches/month)
- Supporting keywords to weave in naturally: ${input.keywordGrounding.supportingKeywords.map((k) => `"${k}"`).join(", ")}
- Ensure the primary keyword appears in the module title and the first lesson's H1 heading.
- Do not keyword-stuff; write for humans first, search engines second.

`
    : "";

  const trendSection = input.socialTrendGrounding
    ? `Social Trend Context:
- This module was triggered by a trending topic: "${input.socialTrendGrounding.trendingTopic}" on ${input.socialTrendGrounding.platform}
- Sentiment: ${input.socialTrendGrounding.sentimentContext}
- Frame the content to address the questions and concerns driving this trend. Be timely and relevant.

`
    : "";

  return `Create a comprehensive educational module on "${input.topic}".

Target Audience: ${input.targetAudience === "staff" ? "Beauty/Medical Spa Staff" : input.targetAudience === "clients" ? "Clients/Customers" : "General Audience"}
Difficulty Level: ${input.difficulty}
Category: ${input.category}
Number of Lessons: ${input.lessonCount}
Tone: ${input.tone}

${seoSection}${trendSection}${objectivesSection}${referenceSection}
Requirements:
- Create ${input.lessonCount} structured lessons with clear progression
- Each lesson should be 10-20 minutes of reading time
- Include practical, actionable content
${quizInstruction}${visualInstruction}
- Include real-world examples and scenarios
- Use professional but ${input.tone} language
- Make content engaging and memorable

Output Format (JSON):
{
  "title": "Module title",
  "description": "Detailed module description (2-3 paragraphs)",
  "shortDescription": "Brief summary (1-2 sentences)",
  "estimatedDurationMinutes": total estimated time,
  "learningObjectives": ["objective 1", "objective 2", ...],
  "prerequisites": ["prerequisite 1", ...],
  "tags": ["tag1", "tag2", ...],
  "lessons": [
    {
      "slug": "lesson-url-slug",
      "title": "Lesson Title",
      "description": "Lesson description",
      "durationMinutes": estimated minutes,
      "content": [
        {"type": "heading", "level": 1, "content": "Heading text"},
        {"type": "text", "content": "Paragraph text"},
        {"type": "list", "style": "bullet", "items": ["item 1", "item 2"]},
        {"type": "callout", "variant": "tip|info|warning|success", "title": "Optional title", "content": "Callout content"},
        {"type": "quiz", "question": "Question text", "options": ["A", "B", "C", "D"], "correctOptionIndex": 0, "explanation": "Why this is correct"}
      ]
    }
  ]
}`;
};

export const buildLessonRegenerationPrompt = (input: {
  moduleTitle: string;
  lessonTitle: string;
  currentContent: LessonContentBlock[];
  customInstructions?: string;
}): string => {
  const currentContentSummary = input.currentContent
    .map((block) => {
      if (block.type === "text") return `Text: ${block.content.slice(0, 100)}...`;
      if (block.type === "heading") return `Heading: ${block.content}`;
      if (block.type === "list") return `List (${block.style}): ${block.items.length} items`;
      if (block.type === "quiz") return `Quiz: ${block.question}`;
      return `${block.type}: content`;
    })
    .join("\n");

  return `Regenerate content for the lesson "${input.lessonTitle}" in the module "${input.moduleTitle}".

Current Content Summary:
${currentContentSummary}

${input.customInstructions ? `Custom Instructions: ${input.customInstructions}\n\n` : ""}
Requirements:
- Maintain the same learning objectives and structure
- Improve clarity and engagement
- Add more practical examples
- Ensure professional tone

Output the regenerated content using the same JSON format as the original lesson.`;
};

// Validation
export const validateModule = (module: EducationModule): string[] => {
  const errors: string[] = [];

  if (!module.title.trim()) errors.push("Title is required");
  if (!module.description.trim()) errors.push("Description is required");
  if (!module.shortDescription.trim()) errors.push("Short description is required");
  if (module.learningObjectives.length === 0) errors.push("At least one learning objective is required");
  if (module.estimatedDurationMinutes <= 0) errors.push("Duration must be positive");

  return errors;
};

export const validateLesson = (lesson: EducationLesson): string[] => {
  const errors: string[] = [];

  if (!lesson.title.trim()) errors.push("Lesson title is required");
  if (!lesson.description.trim()) errors.push("Lesson description is required");
  if (lesson.content.length === 0) errors.push("Lesson must have content");

  return errors;
};

export const isModulePublishable = (module: EducationModule): boolean => {
  if (module.lessons.length === 0) return false;
  return validateModule(module).length === 0;
};
