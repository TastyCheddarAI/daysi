import { randomUUID } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Keyword demand (DataForSEO)
// ─────────────────────────────────────────────────────────────────────────────

export interface SerpResult {
  rank: number;
  title: string;
  url: string;
  description: string;
}

export interface KeywordDemandSnapshot {
  id: string;
  service: string; // e.g. "laser hair removal"
  location: string; // e.g. "Calgary, AB"
  keyword: string;
  monthlySearchVolume: number;
  competition: "LOW" | "MEDIUM" | "HIGH";
  cpc: number; // cost-per-click in USD
  trend: number[]; // 12-month search volume array (oldest → newest)
  trendDirection: "RISING" | "STABLE" | "DECLINING";
  serp: SerpResult[];
  scannedAt: Date;
}

export const createKeywordDemandSnapshot = (
  input: Omit<KeywordDemandSnapshot, "id">,
): KeywordDemandSnapshot => ({
  ...input,
  id: `kwd_${randomUUID()}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// Competitor monitoring (Perplexity)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompetitorClinicRecord {
  id: string;
  competitorName: string;
  websiteUrl: string;
  location: string;
  services: string[];
  pricing: Record<string, number>; // service name → price in cents
  rating: number;
  reviewCount: number;
  educationContent: string[]; // topics they publish
  scannedAt: Date;
}

export interface CompetitorChangeAlert {
  id: string;
  competitorId: string;
  competitorName: string;
  changeType: "PRICE_CHANGE" | "NEW_SERVICE" | "NEW_CONTENT" | "RATING_CHANGE";
  previousValue: string;
  newValue: string;
  significance: "LOW" | "MEDIUM" | "HIGH";
  acknowledged: boolean;
  detectedAt: Date;
}

export const createCompetitorClinicRecord = (
  input: Omit<CompetitorClinicRecord, "id">,
): CompetitorClinicRecord => ({
  ...input,
  id: `comp_${randomUUID()}`,
});

export const createCompetitorChangeAlert = (
  input: Omit<CompetitorChangeAlert, "id" | "acknowledged">,
): CompetitorChangeAlert => ({
  ...input,
  id: `alert_${randomUUID()}`,
  acknowledged: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Social trend detection (xAI/Grok)
// ─────────────────────────────────────────────────────────────────────────────

export interface SocialTrendRecord {
  id: string;
  platform: "TWITTER" | "REDDIT" | "TIKTOK" | "INSTAGRAM";
  topic: string;
  relatedServices: string[]; // daysi services this trend maps to
  sentimentScore: number; // -1 (negative) to 1 (positive)
  velocity: number; // estimated posts/hour
  peakReachedAt: Date | null;
  scannedAt: Date;
}

export const createSocialTrendRecord = (
  input: Omit<SocialTrendRecord, "id">,
): SocialTrendRecord => ({
  ...input,
  id: `trend_${randomUUID()}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// Content suggestions (bridge layer — keywords + trends → education modules)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentSuggestion {
  id: string;
  title: string;
  outline: string[];
  sourceSignals: {
    keywords?: string[];
    competitorGap?: string;
    trendTopic?: string;
    trendPlatform?: string;
  };
  estimatedSearchVolume: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "ACCEPTED" | "DISMISSED";
  createdAt: Date;
}

export const createContentSuggestion = (
  input: Omit<ContentSuggestion, "id" | "status" | "createdAt">,
): ContentSuggestion => ({
  ...input,
  id: `sug_${randomUUID()}`,
  status: "PENDING",
  createdAt: new Date(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Customer journey intelligence (Kimi 200k context)
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerJourneyIntelligence {
  customerId: string;
  analysisDate: Date;
  bookingPattern: string; // e.g. "Monthly facial, skips summers"
  churnRisk: "LOW" | "MEDIUM" | "HIGH";
  churnRiskReason: string;
  recommendedOutreach: string; // specific action for staff/marketing
  lifetimeValueEstimate: number; // in cents
  nextBookingPrediction: Date | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Market brief (OpenAI weekly synthesis)
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketBriefReport {
  id: string;
  weekOf: Date;
  executiveSummary: string;
  topKeywordOpportunities: KeywordDemandSnapshot[];
  competitorAlerts: CompetitorChangeAlert[];
  trendingTopics: SocialTrendRecord[];
  contentSuggestionsGenerated: number;
  churnRisksIdentified: number;
  generatedAt: Date;
}

export const createMarketBriefReport = (
  input: Omit<MarketBriefReport, "id" | "generatedAt">,
): MarketBriefReport => ({
  ...input,
  id: `brief_${randomUUID()}`,
  generatedAt: new Date(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Repository interface
// ─────────────────────────────────────────────────────────────────────────────

type Awaitable<T> = T | Promise<T>;

export interface MarketIntelligenceRepository {
  keywordDemand: {
    save(snapshot: KeywordDemandSnapshot): Awaitable<void>;
    findByService(service: string, location: string): Awaitable<KeywordDemandSnapshot[]>;
    findTopOpportunities(limit: number): Awaitable<KeywordDemandSnapshot[]>;
  };
  competitors: {
    save(record: CompetitorClinicRecord): Awaitable<void>;
    findAll(): Awaitable<CompetitorClinicRecord[]>;
    findByName(name: string): Awaitable<CompetitorClinicRecord | null>;
    saveAlert(alert: CompetitorChangeAlert): Awaitable<void>;
    findUnacknowledgedAlerts(): Awaitable<CompetitorChangeAlert[]>;
    acknowledgeAlert(id: string): Awaitable<void>;
  };
  socialTrends: {
    save(record: SocialTrendRecord): Awaitable<void>;
    findRising(minVelocity: number): Awaitable<SocialTrendRecord[]>;
    findRecent(limitHours: number): Awaitable<SocialTrendRecord[]>;
  };
  contentSuggestions: {
    save(suggestion: ContentSuggestion): Awaitable<void>;
    findPending(): Awaitable<ContentSuggestion[]>;
    findById(id: string): Awaitable<ContentSuggestion | null>;
    updateStatus(id: string, status: ContentSuggestion["status"]): Awaitable<void>;
  };
  customerJourneys: {
    save(intel: CustomerJourneyIntelligence): Awaitable<void>;
    findHighChurnRisk(): Awaitable<CustomerJourneyIntelligence[]>;
    findByCustomer(customerId: string): Awaitable<CustomerJourneyIntelligence | null>;
  };
  marketBriefs: {
    save(brief: MarketBriefReport): Awaitable<void>;
    findLatest(): Awaitable<MarketBriefReport | null>;
    findByWeek(weekOf: Date): Awaitable<MarketBriefReport | null>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory implementation
// ─────────────────────────────────────────────────────────────────────────────

export const createInMemoryMarketIntelligenceRepository =
  (): MarketIntelligenceRepository => {
    const keywordSnapshots: KeywordDemandSnapshot[] = [];
    const competitorRecords: CompetitorClinicRecord[] = [];
    const competitorAlerts: CompetitorChangeAlert[] = [];
    const socialTrends: SocialTrendRecord[] = [];
    const contentSuggestions: ContentSuggestion[] = [];
    const customerJourneys: CustomerJourneyIntelligence[] = [];
    const marketBriefs: MarketBriefReport[] = [];

    return {
      keywordDemand: {
        save(snapshot) {
          const idx = keywordSnapshots.findIndex(
            (s) => s.id === snapshot.id,
          );
          if (idx >= 0) keywordSnapshots[idx] = snapshot;
          else keywordSnapshots.push(snapshot);
        },
        findByService(service, location) {
          return keywordSnapshots.filter(
            (s) =>
              s.service.toLowerCase() === service.toLowerCase() &&
              s.location.toLowerCase() === location.toLowerCase(),
          );
        },
        findTopOpportunities(limit) {
          return [...keywordSnapshots]
            .sort((a, b) => b.monthlySearchVolume - a.monthlySearchVolume)
            .slice(0, limit);
        },
      },

      competitors: {
        save(record) {
          const idx = competitorRecords.findIndex((r) => r.id === record.id);
          if (idx >= 0) competitorRecords[idx] = record;
          else competitorRecords.push(record);
        },
        findAll() {
          return [...competitorRecords];
        },
        findByName(name) {
          return (
            competitorRecords.find(
              (r) => r.competitorName.toLowerCase() === name.toLowerCase(),
            ) ?? null
          );
        },
        saveAlert(alert) {
          const idx = competitorAlerts.findIndex((a) => a.id === alert.id);
          if (idx >= 0) competitorAlerts[idx] = alert;
          else competitorAlerts.push(alert);
        },
        findUnacknowledgedAlerts() {
          return competitorAlerts.filter((a) => !a.acknowledged);
        },
        acknowledgeAlert(id) {
          const alert = competitorAlerts.find((a) => a.id === id);
          if (alert) alert.acknowledged = true;
        },
      },

      socialTrends: {
        save(record) {
          const idx = socialTrends.findIndex((r) => r.id === record.id);
          if (idx >= 0) socialTrends[idx] = record;
          else socialTrends.push(record);
        },
        findRising(minVelocity) {
          return socialTrends
            .filter((r) => r.velocity >= minVelocity)
            .sort((a, b) => b.velocity - a.velocity);
        },
        findRecent(limitHours) {
          const cutoff = new Date(Date.now() - limitHours * 60 * 60 * 1000);
          return socialTrends.filter((r) => r.scannedAt >= cutoff);
        },
      },

      contentSuggestions: {
        save(suggestion) {
          const idx = contentSuggestions.findIndex(
            (s) => s.id === suggestion.id,
          );
          if (idx >= 0) contentSuggestions[idx] = suggestion;
          else contentSuggestions.push(suggestion);
        },
        findPending() {
          return contentSuggestions.filter((s) => s.status === "PENDING");
        },
        findById(id) {
          return contentSuggestions.find((s) => s.id === id) ?? null;
        },
        updateStatus(id, status) {
          const suggestion = contentSuggestions.find((s) => s.id === id);
          if (suggestion) suggestion.status = status;
        },
      },

      customerJourneys: {
        save(intel) {
          const idx = customerJourneys.findIndex(
            (j) => j.customerId === intel.customerId,
          );
          if (idx >= 0) customerJourneys[idx] = intel;
          else customerJourneys.push(intel);
        },
        findHighChurnRisk() {
          return customerJourneys.filter((j) => j.churnRisk === "HIGH");
        },
        findByCustomer(customerId) {
          return (
            customerJourneys.find((j) => j.customerId === customerId) ?? null
          );
        },
      },

      marketBriefs: {
        save(brief) {
          const idx = marketBriefs.findIndex((b) => b.id === brief.id);
          if (idx >= 0) marketBriefs[idx] = brief;
          else marketBriefs.push(brief);
        },
        findLatest() {
          if (marketBriefs.length === 0) return null;
          return [...marketBriefs].sort(
            (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime(),
          )[0];
        },
        findByWeek(weekOf) {
          const weekStart = weekOf.toISOString().slice(0, 10);
          return (
            marketBriefs.find(
              (b) => b.weekOf.toISOString().slice(0, 10) === weekStart,
            ) ?? null
          );
        },
      },
    };
  };
