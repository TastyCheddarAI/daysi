import { DAYSI_API_BASE_URL, DAYSI_DEFAULT_LOCATION_SLUG } from "./daysi-public-api";

export interface LessonContentBlock {
  type:
    | "text"
    | "heading"
    | "list"
    | "callout"
    | "quiz"
    | "image"
    | "video"
    | "audio";
  content?: string;
  level?: number;
  style?: "bullet" | "numbered";
  items?: string[];
  variant?: "info" | "warning" | "tip" | "success";
  title?: string;
  question?: string;
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  url?: string;
  alt?: string;
  caption?: string;
}

export interface EducationLesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationMinutes?: number;
  orderIndex: number;
  content: LessonContentBlock[];
  aiGenerated: boolean;
  aiProvider?: "openai" | "perplexity" | "xai" | "kimi";
  aiModel?: string;
  aiPromptVersion?: string;
  aiRunId?: string;
  createdAt: string;
  updatedAt: string;
  generatedAt?: string;
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

export interface DaysiAdminEducationModule {
  id: string;
  slug: string;
  locationSlug: string;
  title: string;
  description: string;
  shortDescription: string;
  category: EducationModuleCategory;
  difficulty: EducationModuleDifficulty;
  estimatedDurationMinutes: number;
  learningObjectives: string[];
  lessons: EducationLesson[];
  prerequisites: string[];
  tags: string[];
  status: EducationModuleStatus;
  aiGenerated: boolean;
  aiProvider?: "openai" | "perplexity" | "xai" | "kimi";
  aiModel?: string;
  aiPromptVersion?: string;
  aiRunId?: string;
  thumbnailUrl?: string;
  coverImageUrl?: string;
  authorName?: string;
  authorTitle?: string;
  certificationEligible: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  generatedAt?: string;
}

export interface EducationModuleStats {
  totalModules: number;
  publishedModules: number;
  aiGeneratedModules: number;
  totalLessons: number;
  byCategory: Record<string, number>;
}

export interface CreateEducationModuleInput {
  slug: string;
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
}

export interface UpdateEducationModuleInput {
  title?: string;
  description?: string;
  shortDescription?: string;
  category?: EducationModuleCategory;
  difficulty?: EducationModuleDifficulty;
  estimatedDurationMinutes?: number;
  learningObjectives?: string[];
  prerequisites?: string[];
  tags?: string[];
  status?: EducationModuleStatus;
  certificationEligible?: boolean;
  authorName?: string;
  authorTitle?: string;
  lessons?: EducationLesson[];
}

export interface GenerateModuleContentInput {
  topic: string;
  category: EducationModuleCategory;
  difficulty: EducationModuleDifficulty;
  targetAudience?: "staff" | "clients" | "general";
  lessonCount?: number;
  includeQuizzes?: boolean;
  includeVisuals?: boolean;
  keyLearningObjectives?: string[];
  referenceMaterials?: string[];
  tone?: "professional" | "conversational" | "academic" | "friendly";
  provider?: "openai" | "perplexity" | "xai" | "kimi";
  customPrompt?: string;
}

export interface AiGenerationResponse {
  run: {
    id: string;
    task: string;
    locationSlug: string;
    provider: string;
    model: string;
    promptVersion: string;
    status: "pending" | "running" | "completed" | "failed";
    createdAt: string;
  };
  estimatedTokens?: number;
}

class DaysiEducationApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DaysiEducationApiError";
    this.statusCode = statusCode;
  }
}

const buildUrl = (path: string) =>
  `${DAYSI_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new DaysiEducationApiError(
      payload?.error?.message ?? payload?.message ?? "Request failed",
      response.status,
    );
  }

  return payload.data as T;
};

const authorizedFetch = async <T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  return parseResponse<T>(response);
};

export const listDaysiAdminEducationModules = async (
  token: string,
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<{ modules: DaysiAdminEducationModule[]; stats: EducationModuleStats }> => {
  const data = await authorizedFetch<{
    modules: DaysiAdminEducationModule[];
    stats: EducationModuleStats;
  }>(token, `/v1/admin/education/modules?locationSlug=${encodeURIComponent(locationSlug)}`);
  return data;
};

export const getDaysiAdminEducationModule = async (
  token: string,
  slug: string,
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiAdminEducationModule> => {
  const data = await authorizedFetch<{ module: DaysiAdminEducationModule }>(
    token,
    `/v1/admin/education/modules/${encodeURIComponent(slug)}?locationSlug=${encodeURIComponent(locationSlug)}`,
  );
  return data.module;
};

export const createDaysiAdminEducationModule = async (input: {
  token: string;
  locationSlug: string;
} & CreateEducationModuleInput): Promise<DaysiAdminEducationModule> => {
  const data = await authorizedFetch<{ module: DaysiAdminEducationModule }>(
    input.token,
    "/v1/admin/education/modules",
    {
      method: "POST",
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        slug: input.slug,
        title: input.title,
        description: input.description,
        shortDescription: input.shortDescription,
        category: input.category,
        difficulty: input.difficulty,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        learningObjectives: input.learningObjectives,
        prerequisites: input.prerequisites,
        tags: input.tags,
        certificationEligible: input.certificationEligible,
        authorName: input.authorName,
        authorTitle: input.authorTitle,
      }),
    },
  );
  return data.module;
};

export const updateDaysiAdminEducationModule = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
} & UpdateEducationModuleInput): Promise<DaysiAdminEducationModule> => {
  const data = await authorizedFetch<{ module: DaysiAdminEducationModule }>(
    input.token,
    `/v1/admin/education/modules/${encodeURIComponent(input.slug)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.shortDescription && { shortDescription: input.shortDescription }),
        ...(input.category && { category: input.category }),
        ...(input.difficulty && { difficulty: input.difficulty }),
        ...(input.estimatedDurationMinutes && {
          estimatedDurationMinutes: input.estimatedDurationMinutes,
        }),
        ...(input.learningObjectives && { learningObjectives: input.learningObjectives }),
        ...(input.prerequisites && { prerequisites: input.prerequisites }),
        ...(input.tags && { tags: input.tags }),
        ...(input.status && { status: input.status }),
        ...(input.certificationEligible !== undefined && {
          certificationEligible: input.certificationEligible,
        }),
        ...(input.authorName && { authorName: input.authorName }),
        ...(input.authorTitle && { authorTitle: input.authorTitle }),
        ...(input.lessons && { lessons: input.lessons }),
      }),
    },
  );
  return data.module;
};

export const deleteDaysiAdminEducationModule = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
}): Promise<void> => {
  await authorizedFetch<{ deleted: boolean }>(
    input.token,
    `/v1/admin/education/modules/${encodeURIComponent(input.slug)}?locationSlug=${encodeURIComponent(input.locationSlug)}`,
    {
      method: "DELETE",
    },
  );
};

export const publishDaysiAdminEducationModule = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
}): Promise<DaysiAdminEducationModule> => {
  const data = await authorizedFetch<{ module: DaysiAdminEducationModule }>(
    input.token,
    `/v1/admin/education/modules/${encodeURIComponent(input.slug)}/publish?locationSlug=${encodeURIComponent(input.locationSlug)}`,
    {
      method: "POST",
    },
  );
  return data.module;
};

export const generateDaysiAdminModuleContent = async (input: {
  token: string;
  locationSlug: string;
} & GenerateModuleContentInput): Promise<AiGenerationResponse> => {
  const data = await authorizedFetch<AiGenerationResponse>(
    input.token,
    "/v1/ai/education/generate",
    {
      method: "POST",
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        topic: input.topic,
        category: input.category,
        difficulty: input.difficulty,
        targetAudience: input.targetAudience ?? "staff",
        lessonCount: input.lessonCount ?? 5,
        includeQuizzes: input.includeQuizzes ?? true,
        includeVisuals: input.includeVisuals ?? true,
        keyLearningObjectives: input.keyLearningObjectives ?? [],
        referenceMaterials: input.referenceMaterials,
        tone: input.tone ?? "professional",
        provider: input.provider ?? "openai",
        customPrompt: input.customPrompt,
      }),
    },
  );
  return data;
};

export const checkGenerationStatus = async (
  token: string,
  runId: string,
): Promise<{
  runId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
}> => {
  const data = await authorizedFetch<{
    runId: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: unknown;
  }>(token, `/v1/ai/education/generate/${encodeURIComponent(runId)}/status`);
  return data;
};
