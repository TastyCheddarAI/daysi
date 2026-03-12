import type { Pool } from "pg";
import type {
  MarketIntelligenceRepository,
  KeywordDemandSnapshot,
  CompetitorClinicRecord,
  CompetitorChangeAlert,
  SocialTrendRecord,
  ContentSuggestion,
  CustomerJourneyIntelligence,
  MarketBriefReport,
} from "../../../../packages/domain/src/market-intelligence";

type Queryable = Pick<Pool, "query">;

// ─────────────────────────────────────────────────────────────────────────────
// Row → domain mappers
// ─────────────────────────────────────────────────────────────────────────────

const toKeywordSnapshot = (row: Record<string, unknown>): KeywordDemandSnapshot => ({
  id: row.id as string,
  service: row.service as string,
  location: row.location as string,
  keyword: row.keyword as string,
  monthlySearchVolume: row.monthly_search_volume as number,
  competition: row.competition as "LOW" | "MEDIUM" | "HIGH",
  cpc: Number(row.cpc),
  trend: row.trend as number[],
  trendDirection: row.trend_direction as "RISING" | "STABLE" | "DECLINING",
  serp: row.serp as KeywordDemandSnapshot["serp"],
  scannedAt: new Date(row.scanned_at as string),
});

const toCompetitorRecord = (row: Record<string, unknown>): CompetitorClinicRecord => ({
  id: row.id as string,
  competitorName: row.competitor_name as string,
  websiteUrl: row.website_url as string,
  location: row.location as string,
  services: row.services as string[],
  pricing: row.pricing as Record<string, number>,
  rating: Number(row.rating),
  reviewCount: row.review_count as number,
  educationContent: row.education_content as string[],
  scannedAt: new Date(row.scanned_at as string),
});

const toCompetitorAlert = (row: Record<string, unknown>): CompetitorChangeAlert => ({
  id: row.id as string,
  competitorId: row.competitor_id as string,
  competitorName: row.competitor_name as string,
  changeType: row.change_type as CompetitorChangeAlert["changeType"],
  previousValue: row.previous_value as string,
  newValue: row.new_value as string,
  significance: row.significance as "LOW" | "MEDIUM" | "HIGH",
  acknowledged: row.acknowledged as boolean,
  detectedAt: new Date(row.detected_at as string),
});

const toSocialTrend = (row: Record<string, unknown>): SocialTrendRecord => ({
  id: row.id as string,
  platform: row.platform as SocialTrendRecord["platform"],
  topic: row.topic as string,
  relatedServices: row.related_services as string[],
  sentimentScore: Number(row.sentiment_score),
  velocity: Number(row.velocity),
  peakReachedAt: row.peak_reached_at ? new Date(row.peak_reached_at as string) : null,
  scannedAt: new Date(row.scanned_at as string),
});

const toContentSuggestion = (row: Record<string, unknown>): ContentSuggestion => ({
  id: row.id as string,
  title: row.title as string,
  outline: row.outline as string[],
  sourceSignals: row.source_signals as ContentSuggestion["sourceSignals"],
  estimatedSearchVolume: row.estimated_search_volume as number,
  priority: row.priority as ContentSuggestion["priority"],
  status: row.status as ContentSuggestion["status"],
  createdAt: new Date(row.created_at as string),
});

const toCustomerJourney = (row: Record<string, unknown>): CustomerJourneyIntelligence => ({
  customerId: row.customer_id as string,
  analysisDate: new Date(row.analysis_date as string),
  bookingPattern: row.booking_pattern as string,
  churnRisk: row.churn_risk as "LOW" | "MEDIUM" | "HIGH",
  churnRiskReason: row.churn_risk_reason as string,
  recommendedOutreach: row.recommended_outreach as string,
  lifetimeValueEstimate: row.lifetime_value_estimate as number,
  nextBookingPrediction: row.next_booking_prediction
    ? new Date(row.next_booking_prediction as string)
    : null,
});

const toMarketBrief = (row: Record<string, unknown>): MarketBriefReport => ({
  id: row.id as string,
  weekOf: new Date(row.week_of as string),
  executiveSummary: row.executive_summary as string,
  topKeywordOpportunities: row.top_keyword_opportunities as KeywordDemandSnapshot[],
  competitorAlerts: row.competitor_alerts as CompetitorChangeAlert[],
  trendingTopics: row.trending_topics as SocialTrendRecord[],
  contentSuggestionsGenerated: row.content_suggestions_generated as number,
  churnRisksIdentified: row.churn_risks_identified as number,
  generatedAt: new Date(row.generated_at as string),
});

// ─────────────────────────────────────────────────────────────────────────────
// Repository factory
// ─────────────────────────────────────────────────────────────────────────────

export const createPostgresMarketIntelligenceRepository = (
  db: Queryable,
): MarketIntelligenceRepository => ({
  keywordDemand: {
    async save(snapshot) {
      await db.query(
        `
          insert into mi_keyword_snapshots (
            id, service, location, keyword, monthly_search_volume,
            competition, cpc, trend, trend_direction, serp, scanned_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11)
          on conflict (id) do update set
            monthly_search_volume = excluded.monthly_search_volume,
            competition = excluded.competition,
            cpc = excluded.cpc,
            trend = excluded.trend,
            trend_direction = excluded.trend_direction,
            serp = excluded.serp,
            scanned_at = excluded.scanned_at
        `,
        [
          snapshot.id,
          snapshot.service,
          snapshot.location,
          snapshot.keyword,
          snapshot.monthlySearchVolume,
          snapshot.competition,
          snapshot.cpc,
          JSON.stringify(snapshot.trend),
          snapshot.trendDirection,
          JSON.stringify(snapshot.serp),
          snapshot.scannedAt,
        ],
      );
    },

    async findByService(service, location) {
      const result = await db.query<Record<string, unknown>>(
        `
          select * from mi_keyword_snapshots
          where lower(service) = lower($1) and lower(location) = lower($2)
          order by monthly_search_volume desc
        `,
        [service, location],
      );
      return result.rows.map(toKeywordSnapshot);
    },

    async findTopOpportunities(limit) {
      const result = await db.query<Record<string, unknown>>(
        `
          select * from mi_keyword_snapshots
          order by monthly_search_volume desc, scanned_at desc
          limit $1
        `,
        [limit],
      );
      return result.rows.map(toKeywordSnapshot);
    },
  },

  competitors: {
    async save(record) {
      await db.query(
        `
          insert into mi_competitor_records (
            id, competitor_name, website_url, location, services,
            pricing, rating, review_count, education_content, scanned_at, updated_at
          )
          values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9::jsonb, $10, now())
          on conflict (id) do update set
            services = excluded.services,
            pricing = excluded.pricing,
            rating = excluded.rating,
            review_count = excluded.review_count,
            education_content = excluded.education_content,
            scanned_at = excluded.scanned_at,
            updated_at = now()
        `,
        [
          record.id,
          record.competitorName,
          record.websiteUrl,
          record.location,
          JSON.stringify(record.services),
          JSON.stringify(record.pricing),
          record.rating,
          record.reviewCount,
          JSON.stringify(record.educationContent),
          record.scannedAt,
        ],
      );
    },

    async findAll() {
      const result = await db.query<Record<string, unknown>>(
        `select * from mi_competitor_records order by competitor_name asc`,
      );
      return result.rows.map(toCompetitorRecord);
    },

    async findByName(name) {
      const result = await db.query<Record<string, unknown>>(
        `select * from mi_competitor_records where lower(competitor_name) = lower($1) limit 1`,
        [name],
      );
      return result.rows[0] ? toCompetitorRecord(result.rows[0]) : null;
    },

    async saveAlert(alert) {
      await db.query(
        `
          insert into mi_competitor_alerts (
            id, competitor_id, competitor_name, change_type,
            previous_value, new_value, significance, acknowledged, detected_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do update set
            acknowledged = excluded.acknowledged
        `,
        [
          alert.id,
          alert.competitorId,
          alert.competitorName,
          alert.changeType,
          alert.previousValue,
          alert.newValue,
          alert.significance,
          alert.acknowledged,
          alert.detectedAt,
        ],
      );
    },

    async findUnacknowledgedAlerts() {
      const result = await db.query<Record<string, unknown>>(
        `
          select * from mi_competitor_alerts
          where acknowledged = false
          order by detected_at desc
        `,
      );
      return result.rows.map(toCompetitorAlert);
    },

    async acknowledgeAlert(id) {
      await db.query(
        `update mi_competitor_alerts set acknowledged = true where id = $1`,
        [id],
      );
    },
  },

  socialTrends: {
    async save(record) {
      await db.query(
        `
          insert into mi_social_trends (
            id, platform, topic, related_services, sentiment_score,
            velocity, peak_reached_at, scanned_at
          )
          values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
          on conflict (id) do update set
            sentiment_score = excluded.sentiment_score,
            velocity = excluded.velocity,
            peak_reached_at = excluded.peak_reached_at,
            scanned_at = excluded.scanned_at
        `,
        [
          record.id,
          record.platform,
          record.topic,
          JSON.stringify(record.relatedServices),
          record.sentimentScore,
          record.velocity,
          record.peakReachedAt ?? null,
          record.scannedAt,
        ],
      );
    },

    async findRising(minVelocity) {
      const result = await db.query<Record<string, unknown>>(
        `
          select * from mi_social_trends
          where velocity >= $1
          order by velocity desc, scanned_at desc
        `,
        [minVelocity],
      );
      return result.rows.map(toSocialTrend);
    },

    async findRecent(limitHours) {
      const result = await db.query<Record<string, unknown>>(
        `
          select * from mi_social_trends
          where scanned_at >= now() - ($1 || ' hours')::interval
          order by scanned_at desc
        `,
        [limitHours],
      );
      return result.rows.map(toSocialTrend);
    },
  },

  contentSuggestions: {
    async save(suggestion) {
      await db.query(
        `
          insert into mi_content_suggestions (
            id, title, outline, source_signals, estimated_search_volume,
            priority, status, created_at, updated_at
          )
          values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, now())
          on conflict (id) do update set
            status = excluded.status,
            updated_at = now()
        `,
        [
          suggestion.id,
          suggestion.title,
          JSON.stringify(suggestion.outline),
          JSON.stringify(suggestion.sourceSignals),
          suggestion.estimatedSearchVolume,
          suggestion.priority,
          suggestion.status,
          suggestion.createdAt,
        ],
      );
    },

    async findPending() {
      const result = await db.query<Record<string, unknown>>(
        `
          select * from mi_content_suggestions
          where status = 'PENDING'
          order by
            case priority
              when 'URGENT' then 1
              when 'HIGH' then 2
              when 'MEDIUM' then 3
              else 4
            end,
            estimated_search_volume desc
        `,
      );
      return result.rows.map(toContentSuggestion);
    },

    async findById(id) {
      const result = await db.query<Record<string, unknown>>(
        `select * from mi_content_suggestions where id = $1 limit 1`,
        [id],
      );
      return result.rows[0] ? toContentSuggestion(result.rows[0]) : null;
    },

    async updateStatus(id, status) {
      await db.query(
        `update mi_content_suggestions set status = $1, updated_at = now() where id = $2`,
        [status, id],
      );
    },
  },

  customerJourneys: {
    async save(intel) {
      await db.query(
        `
          insert into mi_customer_journeys (
            customer_id, analysis_date, booking_pattern, churn_risk,
            churn_risk_reason, recommended_outreach, lifetime_value_estimate,
            next_booking_prediction, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, now())
          on conflict (customer_id) do update set
            analysis_date = excluded.analysis_date,
            booking_pattern = excluded.booking_pattern,
            churn_risk = excluded.churn_risk,
            churn_risk_reason = excluded.churn_risk_reason,
            recommended_outreach = excluded.recommended_outreach,
            lifetime_value_estimate = excluded.lifetime_value_estimate,
            next_booking_prediction = excluded.next_booking_prediction,
            updated_at = now()
        `,
        [
          intel.customerId,
          intel.analysisDate,
          intel.bookingPattern,
          intel.churnRisk,
          intel.churnRiskReason,
          intel.recommendedOutreach,
          intel.lifetimeValueEstimate,
          intel.nextBookingPrediction ?? null,
        ],
      );
    },

    async findHighChurnRisk() {
      const result = await db.query<Record<string, unknown>>(
        `
          select * from mi_customer_journeys
          where churn_risk = 'HIGH'
          order by analysis_date desc
        `,
      );
      return result.rows.map(toCustomerJourney);
    },

    async findByCustomer(customerId) {
      const result = await db.query<Record<string, unknown>>(
        `select * from mi_customer_journeys where customer_id = $1 limit 1`,
        [customerId],
      );
      return result.rows[0] ? toCustomerJourney(result.rows[0]) : null;
    },
  },

  marketBriefs: {
    async save(brief) {
      await db.query(
        `
          insert into mi_market_briefs (
            id, week_of, executive_summary, top_keyword_opportunities,
            competitor_alerts, trending_topics, content_suggestions_generated,
            churn_risks_identified, generated_at
          )
          values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9)
          on conflict (week_of) do update set
            id = excluded.id,
            executive_summary = excluded.executive_summary,
            top_keyword_opportunities = excluded.top_keyword_opportunities,
            competitor_alerts = excluded.competitor_alerts,
            trending_topics = excluded.trending_topics,
            content_suggestions_generated = excluded.content_suggestions_generated,
            churn_risks_identified = excluded.churn_risks_identified,
            generated_at = excluded.generated_at
        `,
        [
          brief.id,
          brief.weekOf.toISOString().slice(0, 10),
          brief.executiveSummary,
          JSON.stringify(brief.topKeywordOpportunities),
          JSON.stringify(brief.competitorAlerts),
          JSON.stringify(brief.trendingTopics),
          brief.contentSuggestionsGenerated,
          brief.churnRisksIdentified,
          brief.generatedAt,
        ],
      );
    },

    async findLatest() {
      const result = await db.query<Record<string, unknown>>(
        `select * from mi_market_briefs order by week_of desc limit 1`,
      );
      return result.rows[0] ? toMarketBrief(result.rows[0]) : null;
    },

    async findByWeek(weekOf) {
      const result = await db.query<Record<string, unknown>>(
        `select * from mi_market_briefs where week_of = $1 limit 1`,
        [weekOf.toISOString().slice(0, 10)],
      );
      return result.rows[0] ? toMarketBrief(result.rows[0]) : null;
    },
  },
});
