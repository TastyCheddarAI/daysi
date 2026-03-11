import {
  DAYSI_API_BASE_URL,
  DAYSI_DEFAULT_LOCATION_SLUG,
} from "@/lib/daysi-public-api";

export interface DaysiAiSourceProvenance {
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

export interface DaysiAiEvaluation {
  groundingScore: number;
  recommendationCoverageScore: number;
  safetyFlags: string[];
  notes: string[];
}

export interface DaysiAiRun {
  id: string;
  task:
    | "assistant.booking_chat"
    | "assistant.booking_recommendations"
    | "assistant.assessment_follow_up";
  locationSlug: string;
  provider: "openai" | "perplexity" | "xai" | "kimi" | "dataforseo";
  model: string;
  promptVersion: string;
  actorUserId?: string;
  status: "completed";
  sourceProvenance: DaysiAiSourceProvenance[];
  evaluation: DaysiAiEvaluation;
  createdAt: string;
  completedAt: string;
}

export interface DaysiBookingAssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DaysiBookingAssistantChatResponse {
  run: DaysiAiRun;
  answer: {
    message: string;
    suggestedServiceSlugs: string[];
    suggestedMembershipPlanSlugs: string[];
    nextActions: string[];
  };
}

class DaysiAiApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DaysiAiApiError";
    this.statusCode = statusCode;
  }
}

const buildUrl = (path: string) =>
  `${DAYSI_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new DaysiAiApiError(
      payload?.error?.message ?? payload?.message ?? "Daysi AI request failed.",
      response.status,
    );
  }

  return payload.data as T;
};

export const fetchDaysiBookingAssistantChat = async (input: {
  token?: string | null;
  locationSlug?: string;
  messages: DaysiBookingAssistantChatMessage[];
}): Promise<DaysiBookingAssistantChatResponse> => {
  const response = await fetch(buildUrl("/v1/ai/booking-assistant/chat"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
    },
    body: JSON.stringify({
      locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      messages: input.messages,
    }),
  });

  return parseResponse<DaysiBookingAssistantChatResponse>(response);
};
