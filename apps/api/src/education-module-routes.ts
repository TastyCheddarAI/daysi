import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminEducationModuleCreateRequestSchema,
  adminEducationModuleLessonCreateRequestSchema,
  adminEducationModuleLessonUpdateRequestSchema,
  adminEducationModuleResponseSchema,
  adminEducationModulesResponseSchema,
  adminEducationModuleUpdateRequestSchema,
  educationContentGenerationRequestSchema,
  educationContentGenerationResponseSchema,
  educationContentRegenerationRequestSchema,
} from "../../../packages/contracts/src";
import {
  buildAiGeneratedModule,
  createAiService,
  createEducationLesson,
  createEducationModule,
  normalizeModuleSlug,
  type AppActor,
  type EducationModule,
} from "../../../packages/domain/src";

import { getRuntimeClinicData, upsertEducationModule } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import {
  isCanonicalDefinitionWriteEnabled,
  persistCanonicalEducationOffer,
} from "./persistence/canonical-definition-writes";
import type { AppRepositories } from "./persistence/app-repositories";

// In-memory storage for education modules (until DB is set up)
const moduleStore = new Map<string, EducationModule>();

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const getProviderApiKey = (env: AppEnv, provider: string): string | undefined => {
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY;
    case "xai":
      return env.XAI_API_KEY;
    case "perplexity":
      return env.PERPLEXITY_API_KEY;
    case "kimi":
      return env.KIMI_API_KEY;
    default:
      return undefined;
  }
};

export const handleEducationModuleRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const url = buildUrl(input.request, input.env);

  // GET /v1/admin/education/modules - List all modules
  if (input.method === "GET" && input.pathname === "/v1/admin/education/modules") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    
    // Get modules from store
    const modules = Array.from(moduleStore.values()).filter(
      (m) => m.locationSlug === locationSlug,
    );

    const stats = {
      totalModules: modules.length,
      publishedModules: modules.filter((m) => m.status === "published").length,
      aiGeneratedModules: modules.filter((m) => m.aiGenerated).length,
      totalLessons: modules.reduce((sum, m) => sum + m.lessons.length, 0),
      byCategory: modules.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    const summaries = modules.map((m) => ({
      id: m.id,
      slug: m.slug,
      locationSlug: m.locationSlug,
      title: m.title,
      shortDescription: m.shortDescription,
      category: m.category,
      difficulty: m.difficulty,
      estimatedDurationMinutes: m.estimatedDurationMinutes,
      lessonCount: m.lessons.length,
      status: m.status,
      aiGenerated: m.aiGenerated,
      certificationEligible: m.certificationEligible,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    sendJson(
      input.response,
      200,
      adminEducationModulesResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          modules: summaries,
          stats,
        },
      }),
    );
    return true;
  }

  // GET /v1/admin/education/modules/:slug - Get single module
  const singleModuleMatch = input.pathname.match(/^\/v1\/admin\/education\/modules\/([^\/]+)$/);
  if (input.method === "GET" && singleModuleMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const slug = singleModuleMatch[1];
    const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    
    const module = moduleStore.get(`${locationSlug}:${slug}`);

    if (!module) {
      sendError(input.response, 404, "not_found", "Education module not found.");
      return true;
    }

    sendJson(
      input.response,
      200,
      adminEducationModuleResponseSchema.parse({
        ok: true,
        data: { module },
      }),
    );
    return true;
  }

  // POST /v1/admin/education/modules - Create module
  if (input.method === "POST" && input.pathname === "/v1/admin/education/modules") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminEducationModuleCreateRequestSchema.parse(body),
      );

      const slug = normalizeModuleSlug(payload.slug);
      const key = `${payload.locationSlug}:${slug}`;

      if (moduleStore.has(key)) {
        sendError(input.response, 409, "conflict", "Module with this slug already exists.");
        return true;
      }

      const module = createEducationModule({
        slug,
        locationSlug: payload.locationSlug,
        title: payload.title,
        description: payload.description,
        shortDescription: payload.shortDescription,
        category: payload.category,
        difficulty: payload.difficulty,
        estimatedDurationMinutes: payload.estimatedDurationMinutes,
        learningObjectives: payload.learningObjectives,
        prerequisites: payload.prerequisites,
        tags: payload.tags,
        certificationEligible: payload.certificationEligible,
        authorName: payload.authorName,
        authorTitle: payload.authorTitle,
      });

      moduleStore.set(key, module);

      sendJson(
        input.response,
        201,
        adminEducationModuleResponseSchema.parse({
          ok: true,
          data: { module },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // PATCH /v1/admin/education/modules/:slug - Update module
  if (input.method === "PATCH" && singleModuleMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const slug = singleModuleMatch[1];
      const payload = await readJsonBody(input.request, (body) =>
        adminEducationModuleUpdateRequestSchema.parse(body),
      );

      const key = `${payload.locationSlug}:${slug}`;
      const existingModule = moduleStore.get(key);

      if (!existingModule) {
        sendError(input.response, 404, "not_found", "Education module not found.");
        return true;
      }

      const updatedModule: EducationModule = {
        ...existingModule,
        ...(payload.title && { title: payload.title }),
        ...(payload.description && { description: payload.description }),
        ...(payload.shortDescription && { shortDescription: payload.shortDescription }),
        ...(payload.category && { category: payload.category }),
        ...(payload.difficulty && { difficulty: payload.difficulty }),
        ...(payload.estimatedDurationMinutes && {
          estimatedDurationMinutes: payload.estimatedDurationMinutes,
        }),
        ...(payload.learningObjectives && { learningObjectives: payload.learningObjectives }),
        ...(payload.prerequisites && { prerequisites: payload.prerequisites }),
        ...(payload.tags && { tags: payload.tags }),
        ...(payload.status && { status: payload.status }),
        ...(payload.certificationEligible !== undefined && {
          certificationEligible: payload.certificationEligible,
        }),
        ...(payload.authorName && { authorName: payload.authorName }),
        ...(payload.authorTitle && { authorTitle: payload.authorTitle }),
        ...(payload.lessons && { lessons: payload.lessons }),
        updatedAt: new Date().toISOString(),
      };

      moduleStore.set(key, updatedModule);

      sendJson(
        input.response,
        200,
        adminEducationModuleResponseSchema.parse({
          ok: true,
          data: { module: updatedModule },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // DELETE /v1/admin/education/modules/:slug - Delete module
  if (input.method === "DELETE" && singleModuleMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const slug = singleModuleMatch[1];
    const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    const key = `${locationSlug}:${slug}`;

    if (!moduleStore.has(key)) {
      sendError(input.response, 404, "not_found", "Education module not found.");
      return true;
    }

    moduleStore.delete(key);

    sendJson(input.response, 200, { ok: true, data: { deleted: true } });
    return true;
  }

  // POST /v1/admin/education/modules/:slug/publish - Publish module
  const publishMatch = input.pathname.match(/^\/v1\/admin\/education\/modules\/([^\/]+)\/publish$/);
  if (input.method === "POST" && publishMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const slug = publishMatch[1];
    const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    const key = `${locationSlug}:${slug}`;
    const module = moduleStore.get(key);

    if (!module) {
      sendError(input.response, 404, "not_found", "Education module not found.");
      return true;
    }

    if (module.lessons.length === 0) {
      sendError(input.response, 400, "validation_error", "Cannot publish module without lessons.");
      return true;
    }

    const publishedModule: EducationModule = {
      ...module,
      status: "published",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    moduleStore.set(key, publishedModule);

    sendJson(
      input.response,
      200,
      adminEducationModuleResponseSchema.parse({
        ok: true,
        data: { module: publishedModule },
      }),
    );
    return true;
  }

  // POST /v1/admin/education/modules/:slug/lessons - Add lesson
  const lessonsMatch = input.pathname.match(/^\/v1\/admin\/education\/modules\/([^\/]+)\/lessons$/);
  if (input.method === "POST" && lessonsMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const moduleSlug = lessonsMatch[1];
      const payload = await readJsonBody(input.request, (body) =>
        adminEducationModuleLessonCreateRequestSchema.parse(body),
      );

      const key = `${payload.locationSlug}:${moduleSlug}`;
      const module = moduleStore.get(key);

      if (!module) {
        sendError(input.response, 404, "not_found", "Education module not found.");
        return true;
      }

      const lesson = createEducationLesson({
        slug: normalizeModuleSlug(payload.slug),
        title: payload.title,
        description: payload.description,
        durationMinutes: payload.durationMinutes,
        orderIndex: payload.orderIndex,
        content: payload.content,
      });

      const updatedModule: EducationModule = {
        ...module,
        lessons: [...module.lessons, lesson],
        updatedAt: new Date().toISOString(),
      };

      moduleStore.set(key, updatedModule);

      sendJson(
        input.response,
        201,
        adminEducationModuleResponseSchema.parse({
          ok: true,
          data: { module: updatedModule },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // PATCH /v1/admin/education/modules/:slug/lessons/:lessonSlug - Update lesson
  const singleLessonMatch = input.pathname.match(
    /^\/v1\/admin\/education\/modules\/([^\/]+)\/lessons\/([^\/]+)$/,
  );
  if (input.method === "PATCH" && singleLessonMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const moduleSlug = singleLessonMatch[1];
      const lessonSlug = singleLessonMatch[2];
      const payload = await readJsonBody(input.request, (body) =>
        adminEducationModuleLessonUpdateRequestSchema.parse(body),
      );

      const key = `${payload.locationSlug}:${moduleSlug}`;
      const module = moduleStore.get(key);

      if (!module) {
        sendError(input.response, 404, "not_found", "Education module not found.");
        return true;
      }

      const lessonIndex = module.lessons.findIndex((l) => l.slug === lessonSlug);
      if (lessonIndex === -1) {
        sendError(input.response, 404, "not_found", "Lesson not found.");
        return true;
      }

      const updatedLesson = {
        ...module.lessons[lessonIndex],
        ...(payload.title && { title: payload.title }),
        ...(payload.description && { description: payload.description }),
        ...(payload.durationMinutes && { durationMinutes: payload.durationMinutes }),
        ...(payload.orderIndex !== undefined && { orderIndex: payload.orderIndex }),
        ...(payload.content && { content: payload.content }),
        updatedAt: new Date().toISOString(),
      };

      const updatedLessons = [...module.lessons];
      updatedLessons[lessonIndex] = updatedLesson;

      const updatedModule: EducationModule = {
        ...module,
        lessons: updatedLessons,
        updatedAt: new Date().toISOString(),
      };

      moduleStore.set(key, updatedModule);

      sendJson(
        input.response,
        200,
        adminEducationModuleResponseSchema.parse({
          ok: true,
          data: { module: updatedModule },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // DELETE /v1/admin/education/modules/:slug/lessons/:lessonSlug - Delete lesson
  if (input.method === "DELETE" && singleLessonMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const moduleSlug = singleLessonMatch[1];
    const lessonSlug = singleLessonMatch[2];
    const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    const key = `${locationSlug}:${moduleSlug}`;
    const module = moduleStore.get(key);

    if (!module) {
      sendError(input.response, 404, "not_found", "Education module not found.");
      return true;
    }

    const updatedModule: EducationModule = {
      ...module,
      lessons: module.lessons.filter((l) => l.slug !== lessonSlug),
      updatedAt: new Date().toISOString(),
    };

    moduleStore.set(key, updatedModule);

    sendJson(
      input.response,
      200,
      adminEducationModuleResponseSchema.parse({
        ok: true,
        data: { module: updatedModule },
      }),
    );
    return true;
  }

  // POST /v1/ai/education/generate - AI Generate module content
  if (input.method === "POST" && input.pathname === "/v1/ai/education/generate") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        educationContentGenerationRequestSchema.parse(body),
      );

      const apiKey = getProviderApiKey(input.env, payload.provider);
      if (!apiKey) {
        sendError(
          input.response,
          503,
          "internal_error",
          `${payload.provider} API key not configured.`,
        );
        return true;
      }

      const aiRunId = `airun_${randomUUID()}`;
      const now = new Date().toISOString();

      // Create AI run record
      const aiRun = {
        id: aiRunId,
        task: "education.content_generation" as const,
        locationSlug: payload.locationSlug,
        provider: payload.provider,
        model: payload.provider === "openai" ? "gpt-4-turbo-preview" : payload.provider === "xai" ? "grok-2-1212" : payload.provider === "kimi" ? "kimi-k2.5" : "sonar-pro",
        promptVersion: "edu-gen-v1",
        actorUserId: input.actor?.userId,
        status: "running" as const,
        sourceProvenance: [
          {
            id: `src_${randomUUID()}`,
            kind: "generated_content" as const,
            referenceId: aiRunId,
            title: `AI Generated: ${payload.topic}`,
            freshness: "runtime" as const,
          },
        ],
        evaluation: {
          groundingScore: 0,
          recommendationCoverageScore: 0,
          safetyFlags: [],
          notes: ["Content generation in progress"],
        },
        createdAt: now,
      };

      await input.repositories.clinicalIntelligence.aiRuns.save(aiRun);

      // Start AI generation
      const aiService = createAiService(payload.provider, apiKey);
      
      // Run generation asynchronously
      aiService
        .generateModuleContent({
          topic: payload.topic,
          category: payload.category,
          difficulty: payload.difficulty,
          targetAudience: payload.targetAudience,
          lessonCount: payload.lessonCount,
          includeQuizzes: payload.includeQuizzes,
          includeVisuals: payload.includeVisuals,
          keyLearningObjectives: payload.keyLearningObjectives,
          referenceMaterials: payload.referenceMaterials,
          tone: payload.tone,
          locationSlug: payload.locationSlug,
          actorUserId: input.actor?.userId,
        })
        .then(async (result) => {
          if (result.success && result.data) {
            const module = buildAiGeneratedModule({
              content: result.data,
              locationSlug: payload.locationSlug,
              provider: payload.provider,
              model: result.model,
              aiRunId,
              actorUserId: input.actor?.userId,
            });

            // Override with user-specified category and difficulty
            module.category = payload.category;
            module.difficulty = payload.difficulty;

            // Store the module
            const key = `${module.locationSlug}:${module.slug}`;
            moduleStore.set(key, module);

            // Update AI run as completed
            await input.repositories.clinicalIntelligence.aiRuns.save({
              ...aiRun,
              status: "completed",
              completedAt: new Date().toISOString(),
              evaluation: {
                groundingScore: 85,
                recommendationCoverageScore: 90,
                safetyFlags: [],
                notes: [
                  `Generated ${module.lessons.length} lessons`,
                  `Total tokens: ${result.usage?.totalTokens ?? "unknown"}`,
                ],
              },
            });
          } else {
            await input.repositories.clinicalIntelligence.aiRuns.save({
              ...aiRun,
              status: "failed",
              failedAt: new Date().toISOString(),
              errorMessage: result.error ?? "Unknown error",
            });
          }
        })
        .catch(async (error) => {
          await input.repositories.clinicalIntelligence.aiRuns.save({
            ...aiRun,
            status: "failed",
            failedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });
        });

      sendJson(
        input.response,
        202,
        educationContentGenerationResponseSchema.parse({
          ok: true,
          data: {
            run: { ...aiRun, status: "running" as const },
            estimatedTokens: payload.lessonCount * 1000,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  // GET /v1/ai/education/generate/:runId/status - Check generation status
  const generationStatusMatch = input.pathname.match(
    /^\/v1\/ai\/education\/generate\/([^\/]+)\/status$/,
  );
  if (input.method === "GET" && generationStatusMatch) {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const runId = generationStatusMatch[1];
    const aiRun = await input.repositories.clinicalIntelligence.aiRuns.getById(runId);

    if (!aiRun) {
      sendError(input.response, 404, "not_found", "Generation run not found.");
      return true;
    }

    sendJson(input.response, 200, {
      ok: true,
      data: {
        runId,
        status: aiRun.status,
        result: aiRun.result,
      },
    });
    return true;
  }

  return false;
};
