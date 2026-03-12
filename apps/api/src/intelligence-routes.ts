import type { IncomingMessage, ServerResponse } from "node:http";

import type { AppActor } from "../../../packages/domain/src";
import {
  type MarketIntelligenceRepository,
} from "../../../packages/domain/src/market-intelligence";
import {
  runKeywordDemandScan,
  runCompetitorScan,
  runSocialTrendScan,
  runContentSuggestionGeneration,
  runCustomerJourneyAnalysis,
  generateMarketBrief,
  type IntelligenceAiClient,
  DATAFORSEO_LOCATION_CODES,
} from "../../../packages/domain/src/market-intelligence-service";
import { DataForSeoClient } from "../../../packages/domain/src/dataseo-client";

import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

// Adapts any OpenAI-compatible provider (xAI, Perplexity, Kimi, OpenAI) to IntelligenceAiClient
const buildAiClient = (apiKey: string, baseUrl: string, model: string): IntelligenceAiClient => ({
  async complete(systemPrompt, userPrompt) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? "";
  },
});

const getPerplexityClient = (env: AppEnv): IntelligenceAiClient | null => {
  if (!env.PERPLEXITY_API_KEY) return null;
  return buildAiClient(
    env.PERPLEXITY_API_KEY,
    "https://api.perplexity.ai",
    "sonar-pro",
  );
};

const getGrokClient = (env: AppEnv): IntelligenceAiClient | null => {
  if (!env.XAI_API_KEY) return null;
  return buildAiClient(env.XAI_API_KEY, "https://api.x.ai/v1", "grok-2-1212");
};

const getKimiClient = (env: AppEnv): IntelligenceAiClient | null => {
  if (!env.KIMI_API_KEY) return null;
  return buildAiClient(env.KIMI_API_KEY, "https://api.moonshot.cn/v1", "kimi-k2.5");
};

const getOpenAiClient = (env: AppEnv): IntelligenceAiClient | null => {
  if (!env.OPENAI_API_KEY) return null;
  return buildAiClient(
    env.OPENAI_API_KEY,
    "https://api.openai.com/v1",
    "gpt-4-turbo-preview",
  );
};

const getDataForSeoClient = (env: AppEnv): DataForSeoClient | null => {
  if (!env.DATAFORSEO_LOGIN || !env.DATAFORSEO_PASSWORD) return null;
  return new DataForSeoClient(env.DATAFORSEO_LOGIN, env.DATAFORSEO_PASSWORD);
};

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export const handleIntelligenceRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  intelligenceRepo: MarketIntelligenceRepository;
}): Promise<boolean> => {
  const { method, pathname, request, response, actor, env, intelligenceRepo } = input;

  if (!pathname.startsWith("/v1/admin/intelligence")) return false;

  if (!requireAdminActor(actor)) {
    sendError(response, 403, "forbidden", "Admin access is required.");
    return true;
  }

  // ── POST /v1/admin/intelligence/scans/keywords ─────────────────────────────
  if (method === "POST" && pathname === "/v1/admin/intelligence/scans/keywords") {
    const client = getDataForSeoClient(env);
    if (!client) {
      sendError(response, 400, "internal_error", "DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD not configured.");
      return true;
    }

    const body = await readJsonBody(request, (b) => b as {
      services?: string[];
      locations?: Array<{ name: string; code: number }>;
    });

    // Full keyword universe for Winnipeg/MB laser aesthetics market.
    // Callers can override by posting { services: [...], locations: [...] }.
    const services = body.services ?? [
      // Daysi signature — glass facial is the differentiator; own these terms first
      "glass facial",
      "glass skin facial",
      "glass skin treatment",
      "glass skin",
      "korean glass skin",
      // Hair removal
      "laser hair removal",
      "laser hair removal legs",
      "laser hair removal bikini",
      "laser hair removal underarms",
      "laser hair removal face",
      "laser hair removal full body",
      "ipl hair removal",
      "permanent hair removal",
      // Injectables
      "botox",
      "botox forehead",
      "lip filler",
      "lip injections",
      "dermal fillers",
      "anti wrinkle injections",
      // Skin treatments
      "microneedling",
      "rf microneedling",
      "chemical peel",
      "laser skin resurfacing",
      "photofacial",
      "skin rejuvenation",
      "hydrafacial",
      // Condition-based (highest intent)
      "acne scar treatment",
      "rosacea treatment",
      "hyperpigmentation treatment",
      "sun spot removal",
      "skin tightening",
      "tattoo removal",
      "melasma treatment",
      // Business-type
      "med spa",
      "laser clinic",
      "aesthetic clinic",
      "medical aesthetics",
    ];

    const locations = body.locations ?? [
      { name: "Winnipeg, MB", code: DATAFORSEO_LOCATION_CODES.winnipeg },
      { name: "Steinbach, MB", code: DATAFORSEO_LOCATION_CODES.manitoba },
    ];

    try {
      const snapshots = await runKeywordDemandScan(
        locations.map((l) => ({ services, locationName: l.name, locationCode: l.code })),
        client,
        intelligenceRepo,
      );
      sendJson(response, 200, {
        ok: true,
        data: { snapshotsCreated: snapshots.length, snapshots },
      });
    } catch (err) {
      sendError(response, 500, "internal_error", err instanceof Error ? err.message : "Scan failed.");
    }
    return true;
  }

  // ── POST /v1/admin/intelligence/scans/competitors ──────────────────────────
  if (method === "POST" && pathname === "/v1/admin/intelligence/scans/competitors") {
    const ai = getPerplexityClient(env);
    if (!ai) {
      sendError(response, 400, "internal_error", "PERPLEXITY_API_KEY not configured.");
      return true;
    }

    const body = await readJsonBody(request, (b) => b as {
      competitors?: Array<{ name: string; websiteUrl: string; location: string }>;
    });

    const competitors = body.competitors ?? [];
    if (competitors.length === 0) {
      sendError(response, 400, "validation_error", "competitors array is required.");
      return true;
    }

    try {
      const records = await runCompetitorScan(competitors, ai, intelligenceRepo);
      sendJson(response, 200, { ok: true, data: { recordsCreated: records.length, records } });
    } catch (err) {
      sendError(response, 500, "internal_error", err instanceof Error ? err.message : "Scan failed.");
    }
    return true;
  }

  // ── POST /v1/admin/intelligence/scans/social ───────────────────────────────
  if (method === "POST" && pathname === "/v1/admin/intelligence/scans/social") {
    const ai = getGrokClient(env);
    if (!ai) {
      sendError(response, 400, "internal_error", "XAI_API_KEY not configured.");
      return true;
    }

    const body = await readJsonBody(request, (b) => b as { services?: string[] });
    const services = body.services ?? [
      // Daysi signature — monitor viral glass skin content closely
      "glass facial",
      "glass skin",
      "glass skin treatment",
      "korean glass skin",
      "glass glow skin",
      // Core services
      "laser hair removal",
      "botox",
      "lip filler",
      "lip injections",
      "microneedling",
      "hydrafacial",
      "acne scar treatment",
      "skin tightening",
      "chemical peel",
      "med spa",
      // Trending aesthetic formats
      "glow skin",
      "skin barrier",
      "skin flooding",
      "slugging skin care",
      "anti aging skin care",
      "laser skin care",
    ];

    try {
      const trends = await runSocialTrendScan(services, ai, intelligenceRepo);
      sendJson(response, 200, { ok: true, data: { trendsDetected: trends.length, trends } });
    } catch (err) {
      sendError(response, 500, "internal_error", err instanceof Error ? err.message : "Scan failed.");
    }
    return true;
  }

  // ── POST /v1/admin/intelligence/briefs/generate ────────────────────────────
  if (method === "POST" && pathname === "/v1/admin/intelligence/briefs/generate") {
    const ai = getOpenAiClient(env);
    if (!ai) {
      sendError(response, 400, "internal_error", "OPENAI_API_KEY not configured.");
      return true;
    }

    try {
      const brief = await generateMarketBrief(ai, intelligenceRepo);
      sendJson(response, 200, { ok: true, data: brief });
    } catch (err) {
      sendError(response, 500, "internal_error", err instanceof Error ? err.message : "Brief generation failed.");
    }
    return true;
  }

  // ── GET /v1/admin/intelligence/keywords ────────────────────────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/keywords") {
    const url = buildUrl(request, env);
    const service = url.searchParams.get("service") ?? "";
    const location = url.searchParams.get("location") ?? "";

    const snapshots = service || location
      ? await intelligenceRepo.keywordDemand.findByService(service, location)
      : await intelligenceRepo.keywordDemand.findTopOpportunities(50);

    sendJson(response, 200, { ok: true, data: { snapshots } });
    return true;
  }

  // ── GET /v1/admin/intelligence/keywords/opportunities ──────────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/keywords/opportunities") {
    const url = buildUrl(request, env);
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10));
    const snapshots = await intelligenceRepo.keywordDemand.findTopOpportunities(limit);
    sendJson(response, 200, { ok: true, data: { snapshots } });
    return true;
  }

  // ── GET /v1/admin/intelligence/competitors ─────────────────────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/competitors") {
    const records = await intelligenceRepo.competitors.findAll();
    sendJson(response, 200, { ok: true, data: { records } });
    return true;
  }

  // ── GET /v1/admin/intelligence/competitors/alerts ──────────────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/competitors/alerts") {
    const alerts = await intelligenceRepo.competitors.findUnacknowledgedAlerts();
    sendJson(response, 200, { ok: true, data: { alerts } });
    return true;
  }

  // ── POST /v1/admin/intelligence/competitors/alerts/:id/acknowledge ─────────
  const acknowledgeMatch = pathname.match(
    /^\/v1\/admin\/intelligence\/competitors\/alerts\/([^/]+)\/acknowledge$/,
  );
  if (method === "POST" && acknowledgeMatch) {
    const alertId = acknowledgeMatch[1];
    await intelligenceRepo.competitors.acknowledgeAlert(alertId);
    sendJson(response, 200, { ok: true, data: { acknowledged: true } });
    return true;
  }

  // ── GET /v1/admin/intelligence/trends ─────────────────────────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/trends") {
    const url = buildUrl(request, env);
    const minVelocity = parseInt(url.searchParams.get("minVelocity") ?? "0", 10);
    const trends = await intelligenceRepo.socialTrends.findRising(minVelocity);
    sendJson(response, 200, { ok: true, data: { trends } });
    return true;
  }

  // ── GET /v1/admin/intelligence/content-suggestions ─────────────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/content-suggestions") {
    const suggestions = await intelligenceRepo.contentSuggestions.findPending();
    sendJson(response, 200, { ok: true, data: { suggestions } });
    return true;
  }

  // ── POST /v1/admin/intelligence/content-suggestions/generate ───────────────
  if (method === "POST" && pathname === "/v1/admin/intelligence/content-suggestions/generate") {
    try {
      const suggestions = await runContentSuggestionGeneration(intelligenceRepo);
      sendJson(response, 200, {
        ok: true,
        data: { suggestionsCreated: suggestions.length, suggestions },
      });
    } catch (err) {
      sendError(response, 500, "internal_error", err instanceof Error ? err.message : "Generation failed.");
    }
    return true;
  }

  // ── POST /v1/admin/intelligence/content-suggestions/:id/accept ─────────────
  const acceptMatch = pathname.match(
    /^\/v1\/admin\/intelligence\/content-suggestions\/([^/]+)\/accept$/,
  );
  if (method === "POST" && acceptMatch) {
    const suggestionId = acceptMatch[1];
    const suggestion = await intelligenceRepo.contentSuggestions.findById(suggestionId);
    if (!suggestion) {
      sendError(response, 404, "not_found", "Content suggestion not found.");
      return true;
    }

    await intelligenceRepo.contentSuggestions.updateStatus(suggestionId, "ACCEPTED");
    sendJson(response, 200, {
      ok: true,
      data: {
        accepted: true,
        suggestion: { ...suggestion, status: "ACCEPTED" },
        // Return keyword/trend grounding for the caller to use when creating the education module
        keywordGrounding: suggestion.sourceSignals.keywords
          ? {
              primaryKeyword: suggestion.sourceSignals.keywords[0],
              supportingKeywords: suggestion.sourceSignals.keywords.slice(1),
              targetSearchVolume: suggestion.estimatedSearchVolume,
            }
          : undefined,
        socialTrendGrounding: suggestion.sourceSignals.trendTopic
          ? {
              trendingTopic: suggestion.sourceSignals.trendTopic,
              platform: suggestion.sourceSignals.trendPlatform ?? "SOCIAL",
              sentimentContext: "positive interest",
            }
          : undefined,
      },
    });
    return true;
  }

  // ── POST /v1/admin/intelligence/content-suggestions/:id/dismiss ────────────
  const dismissMatch = pathname.match(
    /^\/v1\/admin\/intelligence\/content-suggestions\/([^/]+)\/dismiss$/,
  );
  if (method === "POST" && dismissMatch) {
    const suggestionId = dismissMatch[1];
    const suggestion = await intelligenceRepo.contentSuggestions.findById(suggestionId);
    if (!suggestion) {
      sendError(response, 404, "not_found", "Content suggestion not found.");
      return true;
    }

    await intelligenceRepo.contentSuggestions.updateStatus(suggestionId, "DISMISSED");
    sendJson(response, 200, { ok: true, data: { dismissed: true } });
    return true;
  }

  // ── GET /v1/admin/intelligence/briefs/latest ───────────────────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/briefs/latest") {
    const brief = await intelligenceRepo.marketBriefs.findLatest();
    if (!brief) {
      sendError(response, 404, "not_found", "No market briefs generated yet.");
      return true;
    }
    sendJson(response, 200, { ok: true, data: brief });
    return true;
  }

  // ── POST /v1/admin/intelligence/customer-journeys/analyze ──────────────────
  if (method === "POST" && pathname === "/v1/admin/intelligence/customer-journeys/analyze") {
    const ai = getKimiClient(env);
    if (!ai) {
      sendError(response, 400, "internal_error", "KIMI_API_KEY not configured.");
      return true;
    }

    const body = await readJsonBody(request, (b) => b as {
      customers?: Array<{
        customerId: string;
        customerName: string;
        bookings: Array<{
          date: string;
          service: string;
          status: string;
          amountCents: number;
        }>;
        totalSpentCents: number;
        firstBookingDate: string;
        lastBookingDate: string;
      }>;
    });

    if (!body.customers || body.customers.length === 0) {
      sendError(response, 400, "validation_error", "customers array is required.");
      return true;
    }

    try {
      const results = await runCustomerJourneyAnalysis(body.customers, ai, intelligenceRepo);
      sendJson(response, 200, {
        ok: true,
        data: { analyzed: results.length, journeys: results },
      });
    } catch (err) {
      sendError(response, 500, "internal_error", err instanceof Error ? err.message : "Analysis failed.");
    }
    return true;
  }

  // ── GET /v1/admin/intelligence/customer-journeys/high-churn ────────────────
  if (method === "GET" && pathname === "/v1/admin/intelligence/customer-journeys/high-churn") {
    const journeys = await intelligenceRepo.customerJourneys.findHighChurnRisk();
    sendJson(response, 200, { ok: true, data: { journeys } });
    return true;
  }

  return false;
};
