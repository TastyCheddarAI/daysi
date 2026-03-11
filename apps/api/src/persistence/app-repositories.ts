import type { AppEnv } from "../config";
import {
  createInMemoryAnalyticsRepository,
  type AnalyticsRepository,
} from "./analytics-repository";
import {
  createInMemoryClinicalIntelligenceRepository,
  type ClinicalIntelligenceRepository,
} from "./clinical-intelligence-repository";
import {
  createInMemoryCommerceRepository,
  type CommerceRepository,
} from "./commerce-repository";
import {
  createInMemoryConfigurationRepository,
  type ConfigurationRepository,
} from "./configuration-repository";
import {
  createInMemoryGrowthRepository,
  type GrowthRepository,
} from "./growth-repository";
import {
  createInMemoryEngagementRepository,
  type EngagementRepository,
} from "./engagement-repository";
import {
  createInMemoryOperationsRepository,
  type OperationsRepository,
} from "./operations-repository";
import { createPostgresAnalyticsRepository } from "./postgres-analytics-repository";
import { createPostgresClinicalIntelligenceRepository } from "./postgres-clinical-intelligence-repository";
import { createPostgresBookingRepository } from "./postgres-booking-repository";
import { createPostgresConfigurationRepository } from "./postgres-configuration-repository";
import { createPostgresGrowthRepository } from "./postgres-growth-repository";
import { createPostgresEngagementRepository } from "./postgres-engagement-repository";
import {
  createPostgresMembershipRepository,
  createPostgresOrderRepository,
} from "./postgres-order-membership-repository";
import {
  createPostgresCreditRepository,
  createPostgresServicePackageRepository,
} from "./postgres-package-credit-repository";
import { createPostgresOperationsRepository } from "./postgres-operations-repository";
import { createPostgresReliabilityRepository } from "./postgres-reliability-repository";
import { getPostgresPool } from "./postgres-pool";
import {
  createInMemoryReliabilityRepository,
  type ReliabilityRepository,
} from "./reliability-repository";
import {
  createInMemoryImportRepository,
  type ImportRepository,
} from "./import-repository";
import {
  createInMemoryIntakeFormsRepository,
  type IntakeFormsRepository,
} from "./intake-forms-repository";
import {
  createInMemoryAuditRepository,
  type AuditRepository,
} from "./audit-repository";

export interface AppRepositories {
  clinicalIntelligence: ClinicalIntelligenceRepository;
  commerce: CommerceRepository;
  analytics: AnalyticsRepository;
  configuration: ConfigurationRepository;
  growth: GrowthRepository;
  engagement: EngagementRepository;
  operations: OperationsRepository;
  reliability: ReliabilityRepository;
  imports: ImportRepository;
  intakeForms: IntakeFormsRepository;
  audit: AuditRepository;
}

export const createInMemoryAppRepositories = (): AppRepositories => ({
  clinicalIntelligence: createInMemoryClinicalIntelligenceRepository(),
  commerce: createInMemoryCommerceRepository(),
  analytics: createInMemoryAnalyticsRepository(),
  configuration: createInMemoryConfigurationRepository(),
  growth: createInMemoryGrowthRepository(),
  engagement: createInMemoryEngagementRepository(),
  operations: createInMemoryOperationsRepository(),
  reliability: createInMemoryReliabilityRepository(),
  imports: createInMemoryImportRepository(),
  intakeForms: createInMemoryIntakeFormsRepository(),
  audit: createInMemoryAuditRepository(),
});

export const createAppRepositories = (env: AppEnv): AppRepositories => ({
  ...(() => {
    const commerce = createInMemoryCommerceRepository();
    const analytics = createInMemoryAnalyticsRepository();
    const configuration = createInMemoryConfigurationRepository();
    const growth = createInMemoryGrowthRepository();
    const engagement = createInMemoryEngagementRepository();
    const operations = createInMemoryOperationsRepository();
    const reliability = createInMemoryReliabilityRepository();
    const needsPostgresPool =
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
    const pool = needsPostgresPool ? getPostgresPool(env) : undefined;

    if (env.DAYSI_BOOKING_REPOSITORY === "postgres") {
      commerce.bookings = createPostgresBookingRepository(pool!);
    }

    if (env.DAYSI_ORDER_REPOSITORY === "postgres") {
      commerce.orders = createPostgresOrderRepository(pool!);
    }

    if (env.DAYSI_MEMBERSHIP_REPOSITORY === "postgres") {
      commerce.memberships = createPostgresMembershipRepository(pool!);
    }

    if (env.DAYSI_SERVICE_PACKAGE_REPOSITORY === "postgres") {
      commerce.packages = createPostgresServicePackageRepository(pool!);
    }

    if (env.DAYSI_CREDIT_REPOSITORY === "postgres") {
      commerce.credits = createPostgresCreditRepository(pool!);
    }

    return {
      clinicalIntelligence:
        env.DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY === "postgres"
          ? createPostgresClinicalIntelligenceRepository(pool!)
          : createInMemoryClinicalIntelligenceRepository(),
      commerce,
      analytics:
        env.DAYSI_ANALYTICS_REPOSITORY === "postgres"
          ? createPostgresAnalyticsRepository(pool!)
          : analytics,
      configuration:
        env.DAYSI_CONFIGURATION_REPOSITORY === "postgres"
          ? createPostgresConfigurationRepository(pool!)
          : configuration,
      growth:
        env.DAYSI_GROWTH_REPOSITORY === "postgres"
          ? createPostgresGrowthRepository(pool!)
          : growth,
      engagement:
        env.DAYSI_ENGAGEMENT_REPOSITORY === "postgres"
          ? createPostgresEngagementRepository(pool!)
          : engagement,
      operations:
        env.DAYSI_OPERATIONS_REPOSITORY === "postgres"
          ? createPostgresOperationsRepository(pool!)
          : operations,
      reliability:
        env.DAYSI_RELIABILITY_REPOSITORY === "postgres"
          ? createPostgresReliabilityRepository(pool!)
          : reliability,
      imports: createInMemoryImportRepository(),
      intakeForms: createInMemoryIntakeFormsRepository(),
      audit: createInMemoryAuditRepository(),
    };
  })(),
});
