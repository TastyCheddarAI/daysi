/**
 * Intelligence scheduler — runs automated scans on a cron-like schedule.
 *
 * Uses setInterval (checks every minute) instead of a cron library to avoid
 * adding dependencies. All times are CST (UTC-6 / UTC-5 in summer).
 *
 * Schedule:
 *   Keyword scan     — Sundays 02:00 CST  (weekly)
 *   Social trends    — Every 4 hours
 *   Content suggest  — Daily 00:30 CST    (after midnight, needs keyword data)
 *   Market brief     — Mondays 06:00 CST  (after Sunday keyword scan)
 *
 * Competitor scan and customer journey analysis are intentionally excluded
 * from automation because they require caller-supplied data (competitor list,
 * customer booking history). Trigger them manually via the admin API.
 */

import type { AppEnv } from "./config";
import type { MarketIntelligenceRepository } from "../../../packages/domain/src/market-intelligence";
import {
  runKeywordDemandScan,
  runSocialTrendScan,
  runContentSuggestionGeneration,
  generateMarketBrief,
  type IntelligenceAiClient,
} from "../../../packages/domain/src/market-intelligence-service";
import { DataForSeoClient, DATAFORSEO_LOCATION_CODES } from "../../../packages/domain/src/dataseo-client";

// ─── CST helpers ─────────────────────────────────────────────────────────────

// CST = UTC-6 (standard) / UTC-5 (daylight saving).
// We use a fixed -6 offset — close enough for scheduling, no DST complexity.
const CST_OFFSET_HOURS = -6;

const nowInCst = (): Date => {
  const utcMs = Date.now();
  return new Date(utcMs + CST_OFFSET_HOURS * 60 * 60 * 1000);
};

interface CstTime {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday (undefined = any day)
  hour: number;
  minute: number;
}

const matchesCstTime = (now: Date, target: CstTime): boolean =>
  (target.dayOfWeek === undefined || now.getUTCDay() === target.dayOfWeek) &&
  now.getUTCHours() === target.hour &&
  now.getUTCMinutes() === target.minute;

// ─── AI client builder ────────────────────────────────────────────────────────

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

// ─── Default scan config ───────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  "laser hair removal",
  "botox",
  "facial",
  "microneedling",
  "chemical peel",
  "dermal filler",
  "skin rejuvenation",
];

const DEFAULT_LOCATIONS = [
  { services: DEFAULT_SERVICES, locationName: "Winnipeg, MB", locationCode: DATAFORSEO_LOCATION_CODES.winnipeg },
  { services: DEFAULT_SERVICES, locationName: "Manitoba", locationCode: DATAFORSEO_LOCATION_CODES.manitoba },
];

// ─── Individual scan runners ──────────────────────────────────────────────────

const runKeywordScan = async (env: AppEnv, repo: MarketIntelligenceRepository): Promise<void> => {
  if (!env.DATAFORSEO_LOGIN || !env.DATAFORSEO_PASSWORD) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "warn", msg: "intelligence-scheduler: DATAFORSEO credentials missing, skipping keyword scan" }));
    return;
  }

  const client = new DataForSeoClient(env.DATAFORSEO_LOGIN, env.DATAFORSEO_PASSWORD);
  const snapshots = await runKeywordDemandScan(DEFAULT_LOCATIONS, client, repo);
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    msg: "intelligence-scheduler: keyword scan complete",
    snapshots: snapshots.length,
  }));
};

const runSocialScan = async (env: AppEnv, repo: MarketIntelligenceRepository): Promise<void> => {
  if (!env.XAI_API_KEY) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "warn", msg: "intelligence-scheduler: XAI_API_KEY missing, skipping social scan" }));
    return;
  }

  const ai = buildAiClient(env.XAI_API_KEY, "https://api.x.ai/v1", "grok-2-1212");
  const trends = await runSocialTrendScan(DEFAULT_SERVICES, ai, repo);
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    msg: "intelligence-scheduler: social trend scan complete",
    trends: trends.length,
  }));
};

const runContentSuggestions = async (repo: MarketIntelligenceRepository): Promise<void> => {
  const suggestions = await runContentSuggestionGeneration(repo);
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    msg: "intelligence-scheduler: content suggestions generated",
    suggestions: suggestions.length,
  }));
};

const runBriefGeneration = async (env: AppEnv, repo: MarketIntelligenceRepository): Promise<void> => {
  if (!env.OPENAI_API_KEY) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "warn", msg: "intelligence-scheduler: OPENAI_API_KEY missing, skipping market brief" }));
    return;
  }

  const ai = buildAiClient(env.OPENAI_API_KEY, "https://api.openai.com/v1", "gpt-4-turbo-preview");
  const brief = await generateMarketBrief(ai, repo);
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    msg: "intelligence-scheduler: market brief generated",
    briefId: brief.id,
    weekOf: brief.weekOf,
  }));
};

// ─── Schedule definitions ─────────────────────────────────────────────────────

// CST times expressed as UTC hours (CST = UTC - 6)
// Sunday 02:00 CST  = Sunday 08:00 UTC
// Daily  00:30 CST  = Daily  06:30 UTC
// Monday 06:00 CST  = Monday 12:00 UTC

type ScheduledJob = {
  name: string;
  // Hour (UTC) to run. If dayOfWeek is set, only that weekday. Otherwise daily.
  hour: number;
  minute: number;
  dayOfWeek?: number; // 0=Sun, 1=Mon, …, 6=Sat
  // intervalHours: if set, runs every N hours instead of cron-style
  intervalHours?: number;
  run: (env: AppEnv, repo: MarketIntelligenceRepository) => Promise<void>;
};

const SCHEDULE: ScheduledJob[] = [
  {
    name: "keyword-scan",
    dayOfWeek: 0, // Sunday
    hour: 8,      // 08:00 UTC = 02:00 CST
    minute: 0,
    run: runKeywordScan,
  },
  {
    name: "social-scan",
    intervalHours: 4,
    hour: 0,   // unused when intervalHours is set
    minute: 0,
    run: runSocialScan,
  },
  {
    name: "content-suggestions",
    hour: 6,   // 06:30 UTC = 00:30 CST
    minute: 30,
    run: async (env, repo) => runContentSuggestions(repo),
  },
  {
    name: "market-brief",
    dayOfWeek: 1, // Monday
    hour: 12,     // 12:00 UTC = 06:00 CST
    minute: 0,
    run: runBriefGeneration,
  },
];

// ─── Scheduler bootstrap ──────────────────────────────────────────────────────

export const startIntelligenceScheduler = (
  env: AppEnv,
  intelligenceRepo: MarketIntelligenceRepository,
): void => {
  // Only run in production (cutover) mode
  if (env.DAYSI_RUNTIME_PROFILE !== "cutover") {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      msg: "intelligence-scheduler: disabled in non-cutover profile",
    }));
    return;
  }

  // Track last run times for interval-based jobs
  const lastRun = new Map<string, number>();

  // Run every minute and check whether any scheduled jobs should fire
  const tick = async (): Promise<void> => {
    const now = nowInCst();
    const nowMs = Date.now();

    for (const job of SCHEDULE) {
      try {
        if (job.intervalHours !== undefined) {
          // Interval-based: run if enough time has passed since last run
          const last = lastRun.get(job.name) ?? 0;
          if (nowMs - last >= job.intervalHours * 60 * 60 * 1000) {
            lastRun.set(job.name, nowMs);
            await job.run(env, intelligenceRepo);
          }
        } else {
          // Cron-style: run at the specific UTC hour:minute (with day-of-week filter)
          const target: CstTime = { dayOfWeek: job.dayOfWeek as number, hour: job.hour, minute: job.minute };
          if (matchesCstTime(now, target)) {
            const lastKey = `${job.name}-${now.getUTCDay()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
            if (!lastRun.has(lastKey)) {
              lastRun.set(lastKey, nowMs);
              await job.run(env, intelligenceRepo);
            }
          }
        }
      } catch (err) {
        console.error(JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          msg: `intelligence-scheduler: job "${job.name}" failed`,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
  };

  // Check every 60 seconds. .unref() so this timer doesn't prevent process exit.
  setInterval(() => {
    tick().catch((err) => {
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        msg: "intelligence-scheduler: tick error",
        error: err instanceof Error ? err.message : String(err),
      }));
    });
  }, 60_000).unref();

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    msg: "intelligence-scheduler: started",
    jobs: SCHEDULE.map((j) => j.name),
  }));
};
