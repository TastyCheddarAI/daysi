import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadAppEnv } from "../config";

const getPostgresPool = vi.fn();

const postgresClinicalIntelligenceRepository = { kind: "clinical-intelligence" };
const postgresBookingRepository = { kind: "booking" };
const postgresOrderRepository = { kind: "order" };
const postgresMembershipRepository = { kind: "membership" };
const postgresServicePackageRepository = { kind: "service-package" };
const postgresCreditRepository = { kind: "credit" };
const postgresAnalyticsRepository = { kind: "analytics" };
const postgresConfigurationRepository = { kind: "configuration" };
const postgresGrowthRepository = { kind: "growth" };
const postgresEngagementRepository = { kind: "engagement" };
const postgresOperationsRepository = { kind: "operations" };
const postgresReliabilityRepository = { kind: "reliability" };

const createPostgresClinicalIntelligenceRepository = vi.fn(
  () => postgresClinicalIntelligenceRepository,
);
const createPostgresBookingRepository = vi.fn(() => postgresBookingRepository);
const createPostgresOrderRepository = vi.fn(() => postgresOrderRepository);
const createPostgresMembershipRepository = vi.fn(() => postgresMembershipRepository);
const createPostgresServicePackageRepository = vi.fn(
  () => postgresServicePackageRepository,
);
const createPostgresCreditRepository = vi.fn(() => postgresCreditRepository);
const createPostgresAnalyticsRepository = vi.fn(() => postgresAnalyticsRepository);
const createPostgresConfigurationRepository = vi.fn(
  () => postgresConfigurationRepository,
);
const createPostgresGrowthRepository = vi.fn(() => postgresGrowthRepository);
const createPostgresEngagementRepository = vi.fn(() => postgresEngagementRepository);
const createPostgresOperationsRepository = vi.fn(() => postgresOperationsRepository);
const createPostgresReliabilityRepository = vi.fn(() => postgresReliabilityRepository);

vi.mock("./postgres-pool", () => ({
  getPostgresPool,
}));

vi.mock("./postgres-clinical-intelligence-repository", () => ({
  createPostgresClinicalIntelligenceRepository,
}));

vi.mock("./postgres-booking-repository", () => ({
  createPostgresBookingRepository,
}));

vi.mock("./postgres-order-membership-repository", () => ({
  createPostgresOrderRepository,
  createPostgresMembershipRepository,
}));

vi.mock("./postgres-package-credit-repository", () => ({
  createPostgresServicePackageRepository,
  createPostgresCreditRepository,
}));

vi.mock("./postgres-analytics-repository", () => ({
  createPostgresAnalyticsRepository,
}));

vi.mock("./postgres-configuration-repository", () => ({
  createPostgresConfigurationRepository,
}));

vi.mock("./postgres-growth-repository", () => ({
  createPostgresGrowthRepository,
}));

vi.mock("./postgres-engagement-repository", () => ({
  createPostgresEngagementRepository,
}));

vi.mock("./postgres-operations-repository", () => ({
  createPostgresOperationsRepository,
}));

vi.mock("./postgres-reliability-repository", () => ({
  createPostgresReliabilityRepository,
}));

describe("createAppRepositories", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPostgresPool.mockReturnValue({ query: vi.fn() });
  });

  it("keeps bootstrap defaults on in-memory repositories without creating a pool", async () => {
    const env = loadAppEnv({
      DAYSI_BRAND_SLUG: "daysi",
    });

    const { createAppRepositories } = await import("./app-repositories");
    const repositories = createAppRepositories(env);

    expect(getPostgresPool).not.toHaveBeenCalled();
    expect(createPostgresClinicalIntelligenceRepository).not.toHaveBeenCalled();
    expect(createPostgresBookingRepository).not.toHaveBeenCalled();
    expect(createPostgresOrderRepository).not.toHaveBeenCalled();
    expect(createPostgresMembershipRepository).not.toHaveBeenCalled();
    expect(createPostgresServicePackageRepository).not.toHaveBeenCalled();
    expect(createPostgresCreditRepository).not.toHaveBeenCalled();
    expect(createPostgresAnalyticsRepository).not.toHaveBeenCalled();
    expect(createPostgresConfigurationRepository).not.toHaveBeenCalled();
    expect(createPostgresGrowthRepository).not.toHaveBeenCalled();
    expect(createPostgresEngagementRepository).not.toHaveBeenCalled();
    expect(createPostgresOperationsRepository).not.toHaveBeenCalled();
    expect(createPostgresReliabilityRepository).not.toHaveBeenCalled();
    expect(repositories.clinicalIntelligence).not.toBe(
      postgresClinicalIntelligenceRepository,
    );
    expect(repositories.commerce.bookings).not.toBe(postgresBookingRepository);
    expect(repositories.analytics).not.toBe(postgresAnalyticsRepository);
  });

  it("selectively wires configured Postgres repositories through one shared pool", async () => {
    const env = loadAppEnv({
      DAYSI_BRAND_SLUG: "daysi",
      DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY: "postgres",
      DAYSI_BOOKING_REPOSITORY: "postgres",
      DAYSI_ANALYTICS_REPOSITORY: "postgres",
      DATABASE_URL: "postgres://daysi:test@localhost:5432/daysi",
    });

    const { createAppRepositories } = await import("./app-repositories");
    const repositories = createAppRepositories(env);

    const pool = getPostgresPool.mock.results[0]?.value;

    expect(getPostgresPool).toHaveBeenCalledTimes(1);
    expect(getPostgresPool).toHaveBeenCalledWith(env);
    expect(createPostgresClinicalIntelligenceRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresBookingRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresAnalyticsRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresOrderRepository).not.toHaveBeenCalled();
    expect(createPostgresMembershipRepository).not.toHaveBeenCalled();
    expect(createPostgresServicePackageRepository).not.toHaveBeenCalled();
    expect(createPostgresCreditRepository).not.toHaveBeenCalled();
    expect(createPostgresConfigurationRepository).not.toHaveBeenCalled();
    expect(createPostgresGrowthRepository).not.toHaveBeenCalled();
    expect(createPostgresEngagementRepository).not.toHaveBeenCalled();
    expect(createPostgresOperationsRepository).not.toHaveBeenCalled();
    expect(createPostgresReliabilityRepository).not.toHaveBeenCalled();
    expect(repositories.clinicalIntelligence).toBe(postgresClinicalIntelligenceRepository);
    expect(repositories.commerce.bookings).toBe(postgresBookingRepository);
    expect(repositories.analytics).toBe(postgresAnalyticsRepository);
    expect(repositories.commerce.orders).not.toBe(postgresOrderRepository);
    expect(repositories.configuration).not.toBe(postgresConfigurationRepository);
  });

  it("wires the full repository graph to Postgres in cutover mode", async () => {
    const env = loadAppEnv({
      DAYSI_BRAND_SLUG: "daysi",
      DAYSI_RUNTIME_PROFILE: "cutover",
      DATABASE_URL: "postgres://daysi:test@localhost:5432/daysi",
    });

    const { createAppRepositories } = await import("./app-repositories");
    const repositories = createAppRepositories(env);

    const pool = getPostgresPool.mock.results[0]?.value;

    expect(getPostgresPool).toHaveBeenCalledTimes(1);
    expect(createPostgresClinicalIntelligenceRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresBookingRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresOrderRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresMembershipRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresServicePackageRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresCreditRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresAnalyticsRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresConfigurationRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresGrowthRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresEngagementRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresOperationsRepository).toHaveBeenCalledWith(pool);
    expect(createPostgresReliabilityRepository).toHaveBeenCalledWith(pool);
    expect(repositories.clinicalIntelligence).toBe(postgresClinicalIntelligenceRepository);
    expect(repositories.commerce.bookings).toBe(postgresBookingRepository);
    expect(repositories.commerce.orders).toBe(postgresOrderRepository);
    expect(repositories.commerce.memberships).toBe(postgresMembershipRepository);
    expect(repositories.commerce.packages).toBe(postgresServicePackageRepository);
    expect(repositories.commerce.credits).toBe(postgresCreditRepository);
    expect(repositories.analytics).toBe(postgresAnalyticsRepository);
    expect(repositories.configuration).toBe(postgresConfigurationRepository);
    expect(repositories.growth).toBe(postgresGrowthRepository);
    expect(repositories.engagement).toBe(postgresEngagementRepository);
    expect(repositories.operations).toBe(postgresOperationsRepository);
    expect(repositories.reliability).toBe(postgresReliabilityRepository);
  });
});
