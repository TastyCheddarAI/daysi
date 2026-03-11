import { z } from "zod";

const repositoryModeSchema = z.enum(["memory", "postgres"]);
const clinicDefinitionRepositoryModeSchema = z.enum(["bootstrap", "postgres"]);

const appEnvSchema = z.object({
  DAYSI_RUNTIME_PROFILE: z.enum(["bootstrap", "cutover"]).default("bootstrap"),
  DAYSI_ENV: z.string().default("development"),
  DAYSI_BRAND_SLUG: z.string().default("daysi"),
  DAYSI_API_HOST: z.string().default("127.0.0.1"),
  DAYSI_API_PORT: z.coerce.number().int().min(0).default(4010),
  DAYSI_PUBLIC_BRAND_NAME: z.string().default("Daysi"),
  DAYSI_PUBLIC_PRIMARY_DOMAIN: z.string().default("daysi.ca"),
  DAYSI_DEFAULT_LOCATION_SLUG: z.string().default("daysi-flagship"),
  DAYSI_DEFAULT_LOCATION_NAME: z.string().default("Daysi Flagship"),
  DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE: z.enum(["true", "false"]).default("true"),
  DAYSI_CLINIC_DEFINITION_REPOSITORY:
    clinicDefinitionRepositoryModeSchema.default("bootstrap"),
  DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_BOOKING_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_ORDER_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_MEMBERSHIP_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_SERVICE_PACKAGE_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_CREDIT_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_ANALYTICS_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_CONFIGURATION_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_GROWTH_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_ENGAGEMENT_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_OPERATIONS_REPOSITORY: repositoryModeSchema.default("memory"),
  DAYSI_RELIABILITY_REPOSITORY: repositoryModeSchema.default("memory"),
  DATABASE_URL: z.string().optional(),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().int().positive().default(10),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SKIN_ANALYZER_WEBHOOK_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
});

export interface AppEnv {
  DAYSI_RUNTIME_PROFILE: "bootstrap" | "cutover";
  DAYSI_ENV: string;
  DAYSI_BRAND_SLUG: string;
  DAYSI_API_HOST: string;
  DAYSI_API_PORT: number;
  DAYSI_PUBLIC_BRAND_NAME: string;
  DAYSI_PUBLIC_PRIMARY_DOMAIN: string;
  DAYSI_DEFAULT_LOCATION_SLUG: string;
  DAYSI_DEFAULT_LOCATION_NAME: string;
  DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE: boolean;
  DAYSI_CLINIC_DEFINITION_REPOSITORY: "bootstrap" | "postgres";
  DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY: "memory" | "postgres";
  DAYSI_BOOKING_REPOSITORY: "memory" | "postgres";
  DAYSI_ORDER_REPOSITORY: "memory" | "postgres";
  DAYSI_MEMBERSHIP_REPOSITORY: "memory" | "postgres";
  DAYSI_SERVICE_PACKAGE_REPOSITORY: "memory" | "postgres";
  DAYSI_CREDIT_REPOSITORY: "memory" | "postgres";
  DAYSI_ANALYTICS_REPOSITORY: "memory" | "postgres";
  DAYSI_CONFIGURATION_REPOSITORY: "memory" | "postgres";
  DAYSI_GROWTH_REPOSITORY: "memory" | "postgres";
  DAYSI_ENGAGEMENT_REPOSITORY: "memory" | "postgres";
  DAYSI_OPERATIONS_REPOSITORY: "memory" | "postgres";
  DAYSI_RELIABILITY_REPOSITORY: "memory" | "postgres";
  DATABASE_URL?: string;
  DATABASE_SSL: boolean;
  DATABASE_MAX_CONNECTIONS: number;
  STRIPE_WEBHOOK_SECRET?: string;
  SKIN_ANALYZER_WEBHOOK_SECRET?: string;
  OPENAI_API_KEY?: string;
  XAI_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  KIMI_API_KEY?: string;
}

const usesPostgresPersistence = (env: AppEnv): boolean =>
  env.DAYSI_CLINIC_DEFINITION_REPOSITORY === "postgres" ||
  env.DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY === "postgres" ||
  env.DAYSI_BOOKING_REPOSITORY === "postgres" ||
  env.DAYSI_ORDER_REPOSITORY === "postgres" ||
  env.DAYSI_MEMBERSHIP_REPOSITORY === "postgres" ||
  env.DAYSI_SERVICE_PACKAGE_REPOSITORY === "postgres" ||
  env.DAYSI_CREDIT_REPOSITORY === "postgres" ||
  env.DAYSI_ANALYTICS_REPOSITORY === "postgres" ||
  env.DAYSI_CONFIGURATION_REPOSITORY === "postgres" ||
  env.DAYSI_GROWTH_REPOSITORY === "postgres" ||
  env.DAYSI_ENGAGEMENT_REPOSITORY === "postgres" ||
  env.DAYSI_OPERATIONS_REPOSITORY === "postgres" ||
  env.DAYSI_RELIABILITY_REPOSITORY === "postgres";

const hasExplicitValue = (
  source: NodeJS.ProcessEnv,
  key: keyof NodeJS.ProcessEnv | string,
): boolean => source[key] !== undefined;

const cutoverRepositoryMode = <T extends "postgres" | "memory" | "bootstrap">(
  runtimeProfile: AppEnv["DAYSI_RUNTIME_PROFILE"],
  value: T,
  cutoverValue: Exclude<T, "memory" | "bootstrap"> | "postgres",
): T => (runtimeProfile === "cutover" ? (cutoverValue as T) : value);

export const loadAppEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => {
  const parsed = appEnvSchema.parse(source);
  const runtimeProfile = parsed.DAYSI_RUNTIME_PROFILE;
  const bootstrapSessionExchangeExplicit = hasExplicitValue(
    source,
    "DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE",
  );
  const allowBootstrapSessionExchange =
    runtimeProfile === "cutover" && !bootstrapSessionExchangeExplicit
      ? false
      : parsed.DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE === "true";

  const resolvedEnv: AppEnv = {
    ...parsed,
    DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE: allowBootstrapSessionExchange,
    DAYSI_CLINIC_DEFINITION_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_CLINIC_DEFINITION_REPOSITORY,
      "postgres",
    ),
    DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY,
      "postgres",
    ),
    DAYSI_BOOKING_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_BOOKING_REPOSITORY,
      "postgres",
    ),
    DAYSI_ORDER_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_ORDER_REPOSITORY,
      "postgres",
    ),
    DAYSI_MEMBERSHIP_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_MEMBERSHIP_REPOSITORY,
      "postgres",
    ),
    DAYSI_SERVICE_PACKAGE_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_SERVICE_PACKAGE_REPOSITORY,
      "postgres",
    ),
    DAYSI_CREDIT_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_CREDIT_REPOSITORY,
      "postgres",
    ),
    DAYSI_ANALYTICS_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_ANALYTICS_REPOSITORY,
      "postgres",
    ),
    DAYSI_CONFIGURATION_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_CONFIGURATION_REPOSITORY,
      "postgres",
    ),
    DAYSI_GROWTH_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_GROWTH_REPOSITORY,
      "postgres",
    ),
    DAYSI_ENGAGEMENT_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_ENGAGEMENT_REPOSITORY,
      "postgres",
    ),
    DAYSI_OPERATIONS_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_OPERATIONS_REPOSITORY,
      "postgres",
    ),
    DAYSI_RELIABILITY_REPOSITORY: cutoverRepositoryMode(
      runtimeProfile,
      parsed.DAYSI_RELIABILITY_REPOSITORY,
      "postgres",
    ),
    DATABASE_SSL: parsed.DATABASE_SSL === "true",
  };

  if (usesPostgresPersistence(resolvedEnv) && !resolvedEnv.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required when cutover mode or any Postgres-backed repository is enabled.",
    );
  }

  return resolvedEnv;
};
