import type { DataForSeoClient } from "./dataseo-client";
import { DATAFORSEO_LOCATION_CODES } from "./dataseo-client";
import type {
  CompetitorChangeAlert,
  CompetitorClinicRecord,
  ContentSuggestion,
  CustomerJourneyIntelligence,
  KeywordDemandSnapshot,
  MarketBriefReport,
  MarketIntelligenceRepository,
  SocialTrendRecord,
} from "./market-intelligence";
import {
  createCompetitorChangeAlert,
  createCompetitorClinicRecord,
  createContentSuggestion,
  createMarketBriefReport,
  createSocialTrendRecord,
} from "./market-intelligence";

// ─────────────────────────────────────────────────────────────────────────────
// Minimal AI service interface used by intelligence pipelines.
// Compatible with AiService from ai-service.ts — we only use a generic
// `complete` method here to avoid tight coupling to the education domain types.
// ─────────────────────────────────────────────────────────────────────────────

export interface IntelligenceAiClient {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline 1: Keyword demand scan (DataForSEO)
// ─────────────────────────────────────────────────────────────────────────────

export interface KeywordScanInput {
  services: string[];
  locationName: string;
  locationCode: number;
}

export async function runKeywordDemandScan(
  inputs: KeywordScanInput[],
  client: DataForSeoClient,
  repo: MarketIntelligenceRepository,
): Promise<KeywordDemandSnapshot[]> {
  const snapshots: KeywordDemandSnapshot[] = [];

  for (const { services, locationName, locationCode } of inputs) {
    for (const service of services) {
      // Build keyword variants for each service
      const keywords = buildKeywordVariants(service, locationName);

      for (const keyword of keywords) {
        try {
          const snapshot = await client.scanKeyword(
            service,
            keyword,
            locationName,
            locationCode,
          );
          await repo.keywordDemand.save(snapshot);
          snapshots.push(snapshot);
        } catch (err) {
          console.error(`[keyword-scan] Failed for "${keyword}":`, err);
        }
      }
    }
  }

  return snapshots;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline 2: Competitor clinic scan (Perplexity sonar-pro)
// ─────────────────────────────────────────────────────────────────────────────

export async function runCompetitorScan(
  competitors: Array<{ name: string; websiteUrl: string; location: string }>,
  ai: IntelligenceAiClient,
  repo: MarketIntelligenceRepository,
): Promise<CompetitorClinicRecord[]> {
  const records: CompetitorClinicRecord[] = [];

  for (const comp of competitors) {
    const systemPrompt = `You are a market intelligence analyst. Extract structured business information about medical spas and beauty clinics from public sources. Return valid JSON only.`;

    const userPrompt = `Research the medical spa / beauty clinic "${comp.name}" located in ${comp.location} (website: ${comp.websiteUrl}).

Return a JSON object with these fields:
{
  "services": ["service1", "service2"],
  "pricing": { "laser hair removal full leg": 29900, "botox per unit": 1500 },
  "rating": 4.5,
  "reviewCount": 312,
  "educationContent": ["topic1", "topic2"]
}

Use cents for pricing. Return only valid JSON, no markdown.`;

    try {
      const raw = await ai.complete(systemPrompt, userPrompt);
      const parsed = extractJson<{
        services: string[];
        pricing: Record<string, number>;
        rating: number;
        reviewCount: number;
        educationContent: string[];
      }>(raw);

      if (!parsed) continue;

      // Check if competitor already exists
      const existing = await repo.competitors.findByName(comp.name);

      const record = createCompetitorClinicRecord({
        competitorName: comp.name,
        websiteUrl: comp.websiteUrl,
        location: comp.location,
        services: parsed.services ?? [],
        pricing: parsed.pricing ?? {},
        rating: parsed.rating ?? 0,
        reviewCount: parsed.reviewCount ?? 0,
        educationContent: parsed.educationContent ?? [],
        scannedAt: new Date(),
      });

      await repo.competitors.save(record);
      records.push(record);

      // Detect changes vs previous scan
      if (existing) {
        const alerts = detectCompetitorChanges(existing, record);
        for (const alert of alerts) {
          await repo.competitors.saveAlert(alert);
        }
      }
    } catch (err) {
      console.error(`[competitor-scan] Failed for "${comp.name}":`, err);
    }
  }

  return records;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline 3: Social trend detection (xAI/Grok)
// ─────────────────────────────────────────────────────────────────────────────

export async function runSocialTrendScan(
  services: string[],
  ai: IntelligenceAiClient,
  repo: MarketIntelligenceRepository,
): Promise<SocialTrendRecord[]> {
  const systemPrompt = `You are a social media trend analyst specializing in beauty, wellness, and medical aesthetics. Analyze current trends on Twitter/X, Reddit, and TikTok. Return valid JSON only.`;

  const userPrompt = `Analyze current social media trends (as of today) related to these medical spa / beauty services:
${services.map((s) => `- ${s}`).join("\n")}

For each significant trend you identify, return a JSON array of trend objects:
[
  {
    "platform": "TWITTER",
    "topic": "trending topic or hashtag",
    "relatedServices": ["laser hair removal"],
    "sentimentScore": 0.7,
    "velocity": 450,
    "peakReachedAt": null
  }
]

sentimentScore: -1.0 to 1.0 (negative to positive)
velocity: estimated posts per hour
platform: "TWITTER", "REDDIT", "TIKTOK", or "INSTAGRAM"
Return only valid JSON array, no markdown.`;

  const trends: SocialTrendRecord[] = [];

  try {
    const raw = await ai.complete(systemPrompt, userPrompt);
    const parsed = extractJson<
      Array<{
        platform: string;
        topic: string;
        relatedServices: string[];
        sentimentScore: number;
        velocity: number;
        peakReachedAt: string | null;
      }>
    >(raw);

    if (!parsed || !Array.isArray(parsed)) return trends;

    for (const item of parsed) {
      const record = createSocialTrendRecord({
        platform: normalizePlatform(item.platform),
        topic: item.topic,
        relatedServices: item.relatedServices ?? [],
        sentimentScore: Math.max(-1, Math.min(1, item.sentimentScore ?? 0)),
        velocity: Math.max(0, item.velocity ?? 0),
        peakReachedAt: item.peakReachedAt ? new Date(item.peakReachedAt) : null,
        scannedAt: new Date(),
      });

      await repo.socialTrends.save(record);
      trends.push(record);
    }
  } catch (err) {
    console.error("[social-trend-scan] Failed:", err);
  }

  return trends;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline 4: Content suggestion generation (from keyword + trend data)
// ─────────────────────────────────────────────────────────────────────────────

export async function runContentSuggestionGeneration(
  repo: MarketIntelligenceRepository,
): Promise<ContentSuggestion[]> {
  const [topKeywords, risingTrends] = await Promise.all([
    repo.keywordDemand.findTopOpportunities(20),
    repo.socialTrends.findRising(100),
  ]);

  const suggestions: ContentSuggestion[] = [];

  // Generate suggestions from top keywords
  for (const kwd of topKeywords) {
    const suggestion = createContentSuggestion({
      title: buildModuleTitleFromKeyword(kwd.keyword),
      outline: buildOutlineFromKeyword(kwd),
      sourceSignals: {
        keywords: [kwd.keyword],
      },
      estimatedSearchVolume: kwd.monthlySearchVolume,
      priority: priorityFromVolume(kwd.monthlySearchVolume, kwd.trendDirection),
    });
    await repo.contentSuggestions.save(suggestion);
    suggestions.push(suggestion);
  }

  // Generate suggestions from rising social trends
  for (const trend of risingTrends.slice(0, 10)) {
    if (trend.velocity < 200) continue; // Only genuinely viral

    const suggestion = createContentSuggestion({
      title: `${trend.topic}: What Clients Are Asking About`,
      outline: [
        `What is the "${trend.topic}" trend?`,
        "Why clients are curious about this",
        "How our services address this need",
        "What to expect",
        "Next steps",
      ],
      sourceSignals: {
        trendTopic: trend.topic,
        trendPlatform: trend.platform,
      },
      estimatedSearchVolume: 0, // Not keyword-sourced
      priority: trend.velocity > 500 ? "URGENT" : "HIGH",
    });
    await repo.contentSuggestions.save(suggestion);
    suggestions.push(suggestion);
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline 5: Customer journey analysis (Kimi 200k context)
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerHistoryInput {
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
}

export async function runCustomerJourneyAnalysis(
  customers: CustomerHistoryInput[],
  ai: IntelligenceAiClient,
  repo: MarketIntelligenceRepository,
): Promise<CustomerJourneyIntelligence[]> {
  const results: CustomerJourneyIntelligence[] = [];

  for (const customer of customers) {
    const systemPrompt = `You are a customer success analyst for a medical spa. Analyze customer booking history and predict churn risk. Return valid JSON only.`;

    const bookingHistory = customer.bookings
      .map((b) => `${b.date}: ${b.service} (${b.status}, $${(b.amountCents / 100).toFixed(2)})`)
      .join("\n");

    const userPrompt = `Analyze this customer's journey and predict churn risk.

Customer: ${customer.customerName} (ID: ${customer.customerId})
First booking: ${customer.firstBookingDate}
Last booking: ${customer.lastBookingDate}
Total spent: $${(customer.totalSpentCents / 100).toFixed(2)}
Total bookings: ${customer.bookings.length}

Booking history:
${bookingHistory}

Return a JSON object:
{
  "bookingPattern": "Brief description of their booking pattern",
  "churnRisk": "LOW" | "MEDIUM" | "HIGH",
  "churnRiskReason": "Specific reason for churn risk level",
  "recommendedOutreach": "Specific action for staff to retain this customer",
  "lifetimeValueEstimate": 250000,
  "nextBookingPrediction": "2025-04-15" | null
}

lifetimeValueEstimate in cents (projected 12-month value).
Return only valid JSON.`;

    try {
      const raw = await ai.complete(systemPrompt, userPrompt);
      const parsed = extractJson<{
        bookingPattern: string;
        churnRisk: string;
        churnRiskReason: string;
        recommendedOutreach: string;
        lifetimeValueEstimate: number;
        nextBookingPrediction: string | null;
      }>(raw);

      if (!parsed) continue;

      const intel: CustomerJourneyIntelligence = {
        customerId: customer.customerId,
        analysisDate: new Date(),
        bookingPattern: parsed.bookingPattern ?? "",
        churnRisk: normalizeChurnRisk(parsed.churnRisk),
        churnRiskReason: parsed.churnRiskReason ?? "",
        recommendedOutreach: parsed.recommendedOutreach ?? "",
        lifetimeValueEstimate: Math.max(0, parsed.lifetimeValueEstimate ?? 0),
        nextBookingPrediction: parsed.nextBookingPrediction
          ? new Date(parsed.nextBookingPrediction)
          : null,
      };

      await repo.customerJourneys.save(intel);
      results.push(intel);
    } catch (err) {
      console.error(`[journey-analysis] Failed for customer ${customer.customerId}:`, err);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline 6: Weekly market brief synthesis (OpenAI)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMarketBrief(
  ai: IntelligenceAiClient,
  repo: MarketIntelligenceRepository,
): Promise<MarketBriefReport> {
  const [topKeywords, alerts, risingTrends, pendingSuggestions, highChurnCustomers] =
    await Promise.all([
      repo.keywordDemand.findTopOpportunities(10),
      repo.competitors.findUnacknowledgedAlerts(),
      repo.socialTrends.findRising(50),
      repo.contentSuggestions.findPending(),
      repo.customerJourneys.findHighChurnRisk(),
    ]);

  const systemPrompt = `You are a strategic business analyst for a medical spa platform. Write concise, actionable executive summaries. Return valid JSON only.`;

  const userPrompt = `Generate a weekly market intelligence brief based on this data:

TOP KEYWORD OPPORTUNITIES (by search volume):
${topKeywords.map((k) => `- "${k.keyword}" (${k.location}): ${k.monthlySearchVolume}/mo, ${k.trendDirection}`).join("\n")}

COMPETITOR ALERTS (${alerts.length} unacknowledged):
${alerts.slice(0, 5).map((a) => `- ${a.competitorName}: ${a.changeType} — was "${a.previousValue}", now "${a.newValue}"`).join("\n")}

RISING SOCIAL TRENDS:
${risingTrends.slice(0, 5).map((t) => `- "${t.topic}" on ${t.platform}: ${t.velocity} posts/hr, sentiment ${t.sentimentScore.toFixed(1)}`).join("\n")}

CONTENT PIPELINE: ${pendingSuggestions.length} suggestions pending approval
HIGH CHURN RISK CUSTOMERS: ${highChurnCustomers.length}

Write a 3-4 sentence executive summary that highlights the most actionable insights.
Return JSON: { "executiveSummary": "..." }`;

  let executiveSummary = "Market intelligence brief for this week.";

  try {
    const raw = await ai.complete(systemPrompt, userPrompt);
    const parsed = extractJson<{ executiveSummary: string }>(raw);
    if (parsed?.executiveSummary) {
      executiveSummary = parsed.executiveSummary;
    }
  } catch (err) {
    console.error("[market-brief] AI synthesis failed:", err);
  }

  const weekOf = getMondayOfCurrentWeek();

  const brief = createMarketBriefReport({
    weekOf,
    executiveSummary,
    topKeywordOpportunities: topKeywords.slice(0, 5),
    competitorAlerts: alerts.slice(0, 10),
    trendingTopics: risingTrends.slice(0, 5),
    contentSuggestionsGenerated: pendingSuggestions.length,
    churnRisksIdentified: highChurnCustomers.length,
  });

  await repo.marketBriefs.save(brief);
  return brief;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function extractJson<T>(raw: string): T | null {
  try {
    // First try direct parse
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract JSON block
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Keyword categories that get different variant strategies
const HAIR_REMOVAL_SERVICES = new Set([
  "laser hair removal",
  "ipl hair removal",
  "permanent hair removal",
  "laser hair removal legs",
  "laser hair removal bikini",
  "laser hair removal underarms",
  "laser hair removal face",
  "laser hair removal full body",
  "laser hair removal back",
  "laser body hair removal",
]);

const INJECTABLE_SERVICES = new Set([
  "botox",
  "lip filler",
  "lip injections",
  "dermal fillers",
  "cheek filler",
  "jawline filler",
  "anti wrinkle injections",
  "botox forehead",
]);

const CONDITION_SERVICES = new Set([
  "acne scar treatment",
  "rosacea treatment",
  "hyperpigmentation treatment",
  "sun spot removal",
  "age spot removal",
  "broken capillaries treatment",
  "skin tightening",
  "tattoo removal",
]);

const BUSINESS_TYPE_SERVICES = new Set([
  "med spa",
  "medical spa",
  "laser clinic",
  "aesthetic clinic",
  "medical aesthetics",
  "skin care clinic",
  "cosmetic clinic",
]);

// Signature / trend-driven treatments — educational + local + aspirational variants
const SIGNATURE_SERVICES = new Set([
  "glass facial",
  "glass skin facial",
  "glass skin treatment",
  "glass skin",
  "korean glass skin",
  "glass glow facial",
  "glass glow skin",
]);

function buildKeywordVariants(service: string, location: string): string[] {
  const city = location.split(",")[0].trim(); // "Winnipeg"
  const variants: string[] = [];

  if (SIGNATURE_SERVICES.has(service)) {
    // Signature treatments: city-local + near me + "what is" educational + before/after
    // These rank fast because competition is near zero in smaller markets.
    variants.push(
      `${service} ${city}`,
      `${service} near me`,
      `best ${service} ${city}`,
      `what is ${service}`,
      `${service} treatment`,
      `${service} before and after`,
    );
  } else if (BUSINESS_TYPE_SERVICES.has(service)) {
    // Business-type: city-specific + near me + "best"
    variants.push(
      `${service} ${city}`,
      `best ${service} ${city}`,
      `${service} near me`,
      `top rated ${service} ${city}`,
    );
  } else if (CONDITION_SERVICES.has(service)) {
    // Condition-based: city + near me + cost + results
    variants.push(
      `${service} ${city}`,
      `${service} near me`,
      `${service} cost ${city}`,
      `${service} before and after ${city}`,
    );
  } else if (INJECTABLE_SERVICES.has(service)) {
    // Injectables: city + cost/price + near me + reviews
    variants.push(
      `${service} ${city}`,
      `${service} near me`,
      `${service} cost ${city}`,
      `${service} price ${city}`,
      `best ${service} ${city}`,
    );
  } else if (HAIR_REMOVAL_SERVICES.has(service)) {
    // Hair removal: city + near me + cost + permanent + reviews
    variants.push(
      `${service} ${city}`,
      `${service} near me`,
      `${service} cost ${city}`,
      `${service} price ${city}`,
      `best ${service} ${city}`,
      `${service} reviews ${city}`,
    );
  } else {
    // General skin treatments
    variants.push(
      `${service} ${city}`,
      `${service} near me`,
      `best ${service} ${city}`,
      `${service} cost ${city}`,
    );
  }

  return variants;
}

function buildModuleTitleFromKeyword(keyword: string): string {
  return keyword
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildOutlineFromKeyword(kwd: KeywordDemandSnapshot): string[] {
  return [
    `What is ${kwd.service}?`,
    `How ${kwd.service} works`,
    `What to expect during treatment`,
    `Aftercare and results`,
    `Cost and how many sessions are needed`,
    `Finding a qualified provider in ${kwd.location}`,
  ];
}

function priorityFromVolume(
  volume: number,
  trendDirection: KeywordDemandSnapshot["trendDirection"],
): ContentSuggestion["priority"] {
  if (volume >= 5000 && trendDirection === "RISING") return "URGENT";
  if (volume >= 2000 || trendDirection === "RISING") return "HIGH";
  if (volume >= 500) return "MEDIUM";
  return "LOW";
}

function detectCompetitorChanges(
  previous: CompetitorClinicRecord,
  current: CompetitorClinicRecord,
): CompetitorChangeAlert[] {
  const alerts: CompetitorChangeAlert[] = [];

  // Detect price changes
  for (const [service, currentPrice] of Object.entries(current.pricing)) {
    const prevPrice = previous.pricing[service];
    if (prevPrice !== undefined && prevPrice !== currentPrice) {
      const changePct = Math.abs((currentPrice - prevPrice) / prevPrice);
      alerts.push(
        createCompetitorChangeAlert({
          competitorId: current.id,
          competitorName: current.competitorName,
          changeType: "PRICE_CHANGE",
          previousValue: `$${(prevPrice / 100).toFixed(0)}`,
          newValue: `$${(currentPrice / 100).toFixed(0)}`,
          significance: changePct > 0.2 ? "HIGH" : changePct > 0.1 ? "MEDIUM" : "LOW",
          detectedAt: new Date(),
        }),
      );
    }
  }

  // Detect new services
  const prevServices = new Set(previous.services);
  for (const service of current.services) {
    if (!prevServices.has(service)) {
      alerts.push(
        createCompetitorChangeAlert({
          competitorId: current.id,
          competitorName: current.competitorName,
          changeType: "NEW_SERVICE",
          previousValue: "not offered",
          newValue: service,
          significance: "MEDIUM",
          detectedAt: new Date(),
        }),
      );
    }
  }

  // Detect rating changes (significant)
  if (Math.abs(current.rating - previous.rating) >= 0.2) {
    alerts.push(
      createCompetitorChangeAlert({
        competitorId: current.id,
        competitorName: current.competitorName,
        changeType: "RATING_CHANGE",
        previousValue: previous.rating.toFixed(1),
        newValue: current.rating.toFixed(1),
        significance: current.rating > previous.rating ? "LOW" : "HIGH",
        detectedAt: new Date(),
      }),
    );
  }

  return alerts;
}

function normalizePlatform(
  raw: string,
): SocialTrendRecord["platform"] {
  const upper = raw.toUpperCase();
  if (upper === "TWITTER" || upper === "X") return "TWITTER";
  if (upper === "REDDIT") return "REDDIT";
  if (upper === "TIKTOK") return "TIKTOK";
  if (upper === "INSTAGRAM") return "INSTAGRAM";
  return "TWITTER";
}

function normalizeChurnRisk(raw: string): CustomerJourneyIntelligence["churnRisk"] {
  const upper = raw.toUpperCase();
  if (upper === "HIGH") return "HIGH";
  if (upper === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Re-export for convenience
export { DATAFORSEO_LOCATION_CODES };
