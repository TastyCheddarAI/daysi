import type { KeywordDemandSnapshot, SerpResult } from "./market-intelligence";
import { createKeywordDemandSnapshot } from "./market-intelligence";

// ─────────────────────────────────────────────────────────────────────────────
// DataForSEO API client
// Docs: https://docs.dataforseo.com/v3/
// ─────────────────────────────────────────────────────────────────────────────

// Location codes for DataForSEO:
// 2124    = Canada (national)
// 20121   = Manitoba (province)
// 21174   = Winnipeg, Manitoba  ← primary Daysi market (Niverville is a suburb)
// 1002694 = Toronto, Ontario
// Verify/update codes via: GET https://api.dataforseo.com/v3/keywords_data/google_ads/locations
export const DATAFORSEO_LOCATION_CODES = {
  canada: 2124,
  manitoba: 20121,
  winnipeg: 21174,
  toronto: 1002694,
  vancouver: 1002708,
} as const;

export type DataForSeoLocationKey = keyof typeof DATAFORSEO_LOCATION_CODES;

interface DataForSeoKeywordResult {
  keyword: string;
  search_volume: number | null;
  competition: number | null;
  competition_level: string | null;
  cpc: number | null;
  monthly_searches: Array<{ year: number; month: number; search_volume: number }> | null;
}

interface DataForSeoSerpItem {
  rank_absolute: number;
  title: string | null;
  url: string | null;
  description: string | null;
}

interface DataForSeoTask<T> {
  status_code: number;
  result: Array<{ items: T[] | null }> | null;
}

interface DataForSeoResponse<T> {
  status_code: number;
  tasks: Array<DataForSeoTask<T>>;
}

interface DataForSeoTrendPoint {
  date: string;
  value: number;
}

interface DataForSeoTrendItem {
  keyword: string;
  data: DataForSeoTrendPoint[] | null;
}

export class DataForSeoClient {
  private readonly auth: string;
  private readonly baseUrl = "https://api.dataforseo.com";

  constructor(login: string, password: string) {
    this.auth = Buffer.from(`${login}:${password}`).toString("base64");
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DataForSEO API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  // Returns monthly search volume data for a list of keywords in a given location
  async getKeywordSearchVolume(
    keywords: string[],
    locationCode: number,
  ): Promise<DataForSeoKeywordResult[]> {
    const data = await this.post<DataForSeoResponse<DataForSeoKeywordResult>>(
      "/v3/keywords_data/google_ads/search_volume/live",
      [{ keywords, location_code: locationCode, language_code: "en" }],
    );

    const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
    return items;
  }

  // Returns SERP (search engine results page) for a single keyword
  async getSerpResults(
    keyword: string,
    locationCode: number,
  ): Promise<DataForSeoSerpItem[]> {
    const data = await this.post<DataForSeoResponse<DataForSeoSerpItem>>(
      "/v3/serp/google/organic/live/advanced",
      [
        {
          keyword,
          location_code: locationCode,
          language_code: "en",
          depth: 10,
          se_type: "organic",
        },
      ],
    );

    return data.tasks?.[0]?.result?.[0]?.items ?? [];
  }

  // Returns Google Trends data (relative search interest 0-100) for a list of keywords
  async getGoogleTrends(
    keywords: string[],
    dateFrom: string, // "YYYY-MM-DD"
    dateTo: string, // "YYYY-MM-DD"
    locationCode: number = DATAFORSEO_LOCATION_CODES.canada,
  ): Promise<DataForSeoTrendItem[]> {
    const data = await this.post<DataForSeoResponse<DataForSeoTrendItem>>(
      "/v3/keywords_data/google_trends/explore/live",
      [
        {
          keywords,
          location_code: locationCode,
          language_code: "en",
          date_from: dateFrom,
          date_to: dateTo,
          time_range: "past_12_months",
          type: "web",
        },
      ],
    );

    return data.tasks?.[0]?.result?.[0]?.items ?? [];
  }

  // High-level helper: scan a single service + location → returns a snapshot
  async scanKeyword(
    service: string,
    keyword: string,
    location: string,
    locationCode: number,
  ): Promise<KeywordDemandSnapshot> {
    const [volumeData, serpData, trendData] = await Promise.all([
      this.getKeywordSearchVolume([keyword], locationCode),
      this.getSerpResults(keyword, locationCode),
      this.getGoogleTrends(
        [keyword],
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        new Date().toISOString().slice(0, 10),
        locationCode,
      ),
    ]);

    const vol = volumeData[0];
    const monthlySearches = vol?.monthly_searches ?? [];

    // Build 12-month trend array (sorted oldest → newest)
    const sorted = [...monthlySearches].sort(
      (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
    );
    const trend = sorted.slice(-12).map((m) => m.search_volume);

    // Calculate trend direction from last 3 vs first 3 months
    const trendDirection = calculateTrendDirection(trend);

    // Map competition level
    const competitionLevel = mapCompetitionLevel(vol?.competition_level ?? null);

    // Map SERP results
    const serp: SerpResult[] = serpData.slice(0, 10).map((item, i) => ({
      rank: item.rank_absolute ?? i + 1,
      title: item.title ?? "",
      url: item.url ?? "",
      description: item.description ?? "",
    }));

    return createKeywordDemandSnapshot({
      service,
      location,
      keyword,
      monthlySearchVolume: vol?.search_volume ?? 0,
      competition: competitionLevel,
      cpc: vol?.cpc ?? 0,
      trend,
      trendDirection,
      serp,
      scannedAt: new Date(),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calculateTrendDirection(trend: number[]): "RISING" | "STABLE" | "DECLINING" {
  if (trend.length < 6) return "STABLE";

  const firstHalf = trend.slice(0, Math.floor(trend.length / 2));
  const secondHalf = trend.slice(Math.floor(trend.length / 2));

  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

  if (avgFirst === 0) return "STABLE";

  const changePct = (avgSecond - avgFirst) / avgFirst;

  if (changePct > 0.1) return "RISING";
  if (changePct < -0.1) return "DECLINING";
  return "STABLE";
}

function mapCompetitionLevel(level: string | null): "LOW" | "MEDIUM" | "HIGH" {
  switch (level?.toUpperCase()) {
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MEDIUM";
    default:
      return "LOW";
  }
}
