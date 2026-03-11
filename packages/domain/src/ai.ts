import { randomUUID } from "node:crypto";

import type { CatalogService } from "./catalog";
import type { MembershipPlan } from "./memberships";
import type { SkinAssessmentRecord } from "./skin-assessments";

export type AiProvider = "openai" | "perplexity" | "xai" | "kimi" | "dataforseo";
export type AiTask =
  | "assistant.booking_chat"
  | "assistant.booking_recommendations"
  | "assistant.assessment_follow_up";

export interface AiSourceProvenance {
  id: string;
  kind:
    | "internal_catalog"
    | "internal_memberships"
    | "internal_skin_assessment"
    | "policy";
  referenceId: string;
  title: string;
  freshness: "static" | "runtime";
}

export interface AiEvaluation {
  groundingScore: number;
  recommendationCoverageScore: number;
  safetyFlags: string[];
  notes: string[];
}

export interface AiRunRecord {
  id: string;
  task: AiTask;
  locationSlug: string;
  provider: AiProvider;
  model: string;
  promptVersion: string;
  actorUserId?: string;
  status: "completed";
  sourceProvenance: AiSourceProvenance[];
  evaluation: AiEvaluation;
  createdAt: string;
  completedAt: string;
}

export interface BookingAssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BookingAssistantChatResponse {
  run: AiRunRecord;
  answer: {
    message: string;
    suggestedServiceSlugs: string[];
    suggestedMembershipPlanSlugs: string[];
    nextActions: string[];
  };
}

export interface BookingAssistantRecommendation {
  serviceSlug: string;
  serviceName: string;
  reason: string;
  retailAmountCents: number;
  memberAmountCents: number;
  durationMinutes: number;
}

export interface BookingAssistantRecommendationResponse {
  run: AiRunRecord;
  recommendations: BookingAssistantRecommendation[];
  membershipSuggestion?: {
    planSlug: string;
    reason: string;
  };
  bookingSuggestion: {
    locationSlug: string;
    recommendedAction: string;
  };
}

export interface BookingAssistantAssessmentFollowUpResponse {
  run: AiRunRecord;
  assessment: {
    assessmentId: string;
    capturedAt: string;
    summary: string;
    dominantConcernKeys: string[];
    recommendedServiceSlugs: string[];
    unresolvedRecommendedServiceSlugs: string[];
  };
  recommendations: BookingAssistantRecommendation[];
  membershipSuggestion?: {
    planSlug: string;
    reason: string;
  };
  followUpPlan: {
    recommendedAction: string;
    nextActions: string[];
  };
}

const normalizeText = (value: string): string => value.trim().toLowerCase();

const keywordSets = {
  "laser-hair-removal": [
    "hair",
    "laser hair",
    "hair removal",
    "smooth",
    "shaving",
    "waxing",
  ],
  "skin-rejuvenation": [
    "skin",
    "rejuvenation",
    "photofacial",
    "texture",
    "pigment",
    "glow",
    "acne",
    "tone",
  ],
};

const scoreService = (service: CatalogService, text: string): number => {
  const normalized = normalizeText(text);
  let score = 0;

  const matchedKeywords = keywordSets[service.slug as keyof typeof keywordSets] ?? [];
  for (const keyword of matchedKeywords) {
    if (normalized.includes(keyword)) {
      score += 4;
    }
  }

  if (normalized.includes(service.name.toLowerCase())) {
    score += 3;
  }

  for (const tag of service.featureTags) {
    if (normalized.includes(tag.toLowerCase())) {
      score += 1;
    }
  }

  if (score === 0 && service.bookable) {
    score = 1;
  }

  return score;
};

const clampScore = (value: number): number => Math.max(0, Math.min(100, value));

const buildSourceProvenance = (input: {
  services: CatalogService[];
  membershipPlans: MembershipPlan[];
  includeMemberships: boolean;
  assessment?: SkinAssessmentRecord;
}): AiSourceProvenance[] => {
  const sources: AiSourceProvenance[] = input.services.slice(0, 3).map((service) => ({
    id: `src_${randomUUID()}`,
    kind: "internal_catalog",
    referenceId: service.slug,
    title: `${service.name} service catalog record`,
    freshness: "runtime",
  }));

  if (input.assessment) {
    sources.unshift({
      id: `src_${randomUUID()}`,
      kind: "internal_skin_assessment",
      referenceId: input.assessment.id,
      title: `${input.assessment.externalAssessmentId} skin assessment`,
      freshness: "runtime",
    });
  }

  if (input.includeMemberships) {
    for (const plan of input.membershipPlans.slice(0, 2)) {
      sources.push({
        id: `src_${randomUUID()}`,
        kind: "internal_memberships",
        referenceId: plan.slug,
        title: `${plan.name} membership plan`,
        freshness: "runtime",
      });
    }
  }

  sources.push({
    id: `src_${randomUUID()}`,
    kind: "policy",
    referenceId: "booking-assistant-routing-policy",
    title: "Daysi booking assistant routing policy",
    freshness: "static",
  });

  return sources;
};

export const resolveAiProviderRoute = (input: {
  task: AiTask;
  prompt: string;
}): { provider: AiProvider; model: string; promptVersion: string } => {
  const normalized = normalizeText(input.prompt);

  if (input.task === "assistant.booking_chat") {
    if (normalized.length > 900) {
      return {
        provider: "kimi",
        model: "kimi-k2.5-long",
        promptVersion: "booking-chat-v1",
      };
    }

    return {
      provider: "openai",
      model: "gpt-5-mini",
      promptVersion: "booking-chat-v1",
    };
  }

  if (input.task === "assistant.assessment_follow_up") {
    if (normalized.length > 800) {
      return {
        provider: "kimi",
        model: "kimi-k2.5-long",
        promptVersion: "assessment-follow-up-v1",
      };
    }

    return {
      provider: "openai",
      model: "gpt-5-mini",
      promptVersion: "assessment-follow-up-v1",
    };
  }

  return {
    provider: "openai",
    model: "gpt-5-mini",
    promptVersion: "booking-recommendations-v1",
  };
};

export const buildBookingAssistantChat = (input: {
  locationSlug: string;
  actorUserId?: string;
  messages: BookingAssistantChatMessage[];
  services: CatalogService[];
  membershipPlans: MembershipPlan[];
  now?: string;
}): BookingAssistantChatResponse => {
  const latestUserMessage =
    [...input.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const rankedServices = [...input.services]
    .map((service) => ({
      service,
      score: scoreService(service, latestUserMessage),
    }))
    .sort((left, right) => right.score - left.score);
  const suggestedServices = rankedServices
    .filter((entry) => entry.score > 1)
    .slice(0, 2)
    .map((entry) => entry.service);
  const mentionsMembership = /member|membership|monthly|plan|discount/.test(
    normalizeText(latestUserMessage),
  );
  const suggestedPlans = mentionsMembership
    ? input.membershipPlans.filter((plan) => !plan.educationOnly).slice(0, 1)
    : [];
  const route = resolveAiProviderRoute({
    task: "assistant.booking_chat",
    prompt: latestUserMessage,
  });
  const sources = buildSourceProvenance({
    services: suggestedServices.length ? suggestedServices : rankedServices.slice(0, 2).map((entry) => entry.service),
    membershipPlans: suggestedPlans,
    includeMemberships: suggestedPlans.length > 0,
  });
  const notes = suggestedServices.length
    ? [`Matched ${suggestedServices.length} services against the conversation intent.`]
    : ["No strong service match detected; returned general booking guidance."];

  return {
    run: {
      id: `airun_${randomUUID()}`,
      task: "assistant.booking_chat",
      locationSlug: input.locationSlug,
      provider: route.provider,
      model: route.model,
      promptVersion: route.promptVersion,
      actorUserId: input.actorUserId,
      status: "completed",
      sourceProvenance: sources,
      evaluation: {
        groundingScore: clampScore(65 + suggestedServices.length * 10 + suggestedPlans.length * 5),
        recommendationCoverageScore: clampScore(55 + suggestedServices.length * 15),
        safetyFlags: [],
        notes,
      },
      createdAt: input.now ?? new Date().toISOString(),
      completedAt: input.now ?? new Date().toISOString(),
    },
    answer: {
      message: suggestedServices.length
        ? `Based on what you asked, ${suggestedServices.map((service) => service.name).join(" and ")} look like the strongest fit.`
        : "I can help narrow the best booking path if you tell me your treatment goal, concern area, and budget.",
      suggestedServiceSlugs: suggestedServices.map((service) => service.slug),
      suggestedMembershipPlanSlugs: suggestedPlans.map((plan) => plan.slug),
      nextActions: suggestedServices.length
        ? [
            `Review availability for ${suggestedServices[0]?.name}.`,
            "Confirm whether you want retail pricing or a membership option.",
          ]
        : ["Share your concern area.", "Share whether you want one-off or membership pricing."],
    },
  };
};

const buildAssessmentPrompt = (assessment: SkinAssessmentRecord): string =>
  [
    assessment.summary,
    assessment.dominantConcernKeys.join(" "),
    assessment.treatmentGoals.join(" "),
    assessment.recommendedServiceSlugs.join(" "),
    assessment.unresolvedRecommendedServiceSlugs.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

export const buildAssessmentFollowUpRecommendations = (input: {
  locationSlug: string;
  actorUserId?: string;
  assessment: SkinAssessmentRecord;
  prefersMembership?: boolean;
  services: CatalogService[];
  membershipPlans: MembershipPlan[];
  now?: string;
}): BookingAssistantAssessmentFollowUpResponse => {
  const recommendedServiceSlugSet = new Set(input.assessment.recommendedServiceSlugs);
  const scoredServices = [...input.services]
    .filter((service) => service.locationSlug === input.locationSlug && service.bookable)
    .map((service) => {
      const recommendedBoost = recommendedServiceSlugSet.has(service.slug) ? 25 : 0;

      return {
        service,
        score: scoreService(service, buildAssessmentPrompt(input.assessment)) + recommendedBoost,
      };
    })
    .sort((left, right) => right.score - left.score);
  const topServices = scoredServices.slice(0, 3).map((entry) => entry.service);
  const membershipSuggestion =
    input.prefersMembership || topServices.some((service) => service.price.memberAmountCents)
      ? input.membershipPlans.find(
          (plan) => plan.locationSlug === input.locationSlug && !plan.educationOnly,
        )
      : undefined;
  const route = resolveAiProviderRoute({
    task: "assistant.assessment_follow_up",
    prompt: buildAssessmentPrompt(input.assessment),
  });
  const notes = [
    `Grounded on assessment ${input.assessment.externalAssessmentId}.`,
    input.assessment.unresolvedRecommendedServiceSlugs.length > 0
      ? `Unmapped external recommendations: ${input.assessment.unresolvedRecommendedServiceSlugs.join(", ")}.`
      : "All recommended services mapped to the current Daysi catalog.",
  ];

  return {
    run: {
      id: `airun_${randomUUID()}`,
      task: "assistant.assessment_follow_up",
      locationSlug: input.locationSlug,
      provider: route.provider,
      model: route.model,
      promptVersion: route.promptVersion,
      actorUserId: input.actorUserId,
      status: "completed",
      sourceProvenance: buildSourceProvenance({
        services: topServices,
        membershipPlans: membershipSuggestion ? [membershipSuggestion] : [],
        includeMemberships: !!membershipSuggestion,
        assessment: input.assessment,
      }),
      evaluation: {
        groundingScore: clampScore(
          75 +
            Math.min(15, input.assessment.dominantConcernKeys.length * 5) +
            Math.min(10, input.assessment.recommendedServiceSlugs.length * 4),
        ),
        recommendationCoverageScore: clampScore(60 + topServices.length * 10),
        safetyFlags: input.assessment.contraindications.length
          ? ["contraindications_present"]
          : [],
        notes,
      },
      createdAt: input.now ?? new Date().toISOString(),
      completedAt: input.now ?? new Date().toISOString(),
    },
    assessment: {
      assessmentId: input.assessment.id,
      capturedAt: input.assessment.capturedAt,
      summary: input.assessment.summary,
      dominantConcernKeys: input.assessment.dominantConcernKeys,
      recommendedServiceSlugs: input.assessment.recommendedServiceSlugs,
      unresolvedRecommendedServiceSlugs: input.assessment.unresolvedRecommendedServiceSlugs,
    },
    recommendations: topServices.map((service) => ({
      serviceSlug: service.slug,
      serviceName: service.name,
      reason: recommendedServiceSlugSet.has(service.slug)
        ? `Directly matched from the assessment recommendation set and concern profile.`
        : `Matched against the assessment summary, concerns, and treatment goals.`,
      retailAmountCents: service.price.retailAmountCents,
      memberAmountCents:
        service.price.memberAmountCents ?? service.price.retailAmountCents,
      durationMinutes: service.durationMinutes,
    })),
    membershipSuggestion: membershipSuggestion
      ? {
          planSlug: membershipSuggestion.slug,
          reason: "This membership can reduce follow-up treatment cost or unlock member pricing.",
        }
      : undefined,
    followUpPlan: {
      recommendedAction: topServices.length
        ? `Review availability for ${topServices[0]?.name}.`
        : "Review the assessment manually before suggesting a booking.",
      nextActions: [
        input.assessment.contraindications.length > 0
          ? `Review contraindications: ${input.assessment.contraindications.join(", ")}.`
          : "Confirm the client is ready for the recommended treatment path.",
        membershipSuggestion
          ? `Compare retail pricing against ${membershipSuggestion.name}.`
          : "Confirm whether the client wants one-off or bundled pricing.",
      ],
    },
  };
};

export const buildBookingAssistantRecommendations = (input: {
  locationSlug: string;
  actorUserId?: string;
  concern: string;
  budgetAmountCents?: number;
  prefersMembership?: boolean;
  services: CatalogService[];
  membershipPlans: MembershipPlan[];
  now?: string;
}): BookingAssistantRecommendationResponse => {
  const rankedServices = [...input.services]
    .map((service) => ({
      service,
      score: scoreService(service, input.concern),
    }))
    .sort((left, right) => right.score - left.score)
    .filter((entry) => {
      if (!input.budgetAmountCents) {
        return true;
      }

      const price = input.prefersMembership
        ? entry.service.price.memberAmountCents ?? entry.service.price.retailAmountCents
        : entry.service.price.retailAmountCents;

      return price <= input.budgetAmountCents;
    });
  const topServices = rankedServices.slice(0, 2).map((entry) => entry.service);
  const route = resolveAiProviderRoute({
    task: "assistant.booking_recommendations",
    prompt: input.concern,
  });
  const membershipSuggestion =
    input.prefersMembership || /member|monthly|plan|discount/.test(normalizeText(input.concern))
      ? input.membershipPlans.find((plan) => !plan.educationOnly)
      : undefined;

  return {
    run: {
      id: `airun_${randomUUID()}`,
      task: "assistant.booking_recommendations",
      locationSlug: input.locationSlug,
      provider: route.provider,
      model: route.model,
      promptVersion: route.promptVersion,
      actorUserId: input.actorUserId,
      status: "completed",
      sourceProvenance: buildSourceProvenance({
        services: topServices.length ? topServices : input.services.slice(0, 2),
        membershipPlans: membershipSuggestion ? [membershipSuggestion] : [],
        includeMemberships: !!membershipSuggestion,
      }),
      evaluation: {
        groundingScore: clampScore(70 + topServices.length * 10),
        recommendationCoverageScore: clampScore(60 + topServices.length * 15),
        safetyFlags: [],
        notes: [
          `Generated ${topServices.length} booking recommendation candidates.`,
        ],
      },
      createdAt: input.now ?? new Date().toISOString(),
      completedAt: input.now ?? new Date().toISOString(),
    },
    recommendations: topServices.map((service) => ({
      serviceSlug: service.slug,
      serviceName: service.name,
      reason: `Matched to the concern signal for ${input.concern.trim()}.`,
      retailAmountCents: service.price.retailAmountCents,
      memberAmountCents:
        service.price.memberAmountCents ?? service.price.retailAmountCents,
      durationMinutes: service.durationMinutes,
    })),
    membershipSuggestion: membershipSuggestion
      ? {
          planSlug: membershipSuggestion.slug,
          reason: "This plan can reduce treatment cost or unlock member pricing.",
        }
      : undefined,
    bookingSuggestion: {
      locationSlug: input.locationSlug,
      recommendedAction: topServices.length
        ? `Search availability for ${topServices[0]?.name}.`
        : "Collect more treatment goals before recommending a booking.",
    },
  };
};
