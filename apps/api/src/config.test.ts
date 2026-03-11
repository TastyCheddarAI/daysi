import { describe, expect, it } from "vitest";

import { loadAppEnv } from "./config";

describe("loadAppEnv", () => {
  it("defaults to bootstrap profile with bootstrap-friendly repository settings", () => {
    const env = loadAppEnv({
      DAYSI_BRAND_SLUG: "daysi",
    });

    expect(env.DAYSI_RUNTIME_PROFILE).toBe("bootstrap");
    expect(env.DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE).toBe(true);
    expect(env.DAYSI_CLINIC_DEFINITION_REPOSITORY).toBe("bootstrap");
    expect(env.DAYSI_BOOKING_REPOSITORY).toBe("memory");
    expect(env.DAYSI_ORDER_REPOSITORY).toBe("memory");
    expect(env.DAYSI_MEMBERSHIP_REPOSITORY).toBe("memory");
    expect(env.DAYSI_ANALYTICS_REPOSITORY).toBe("memory");
  });

  it("forces the full Postgres-backed repository profile in cutover mode", () => {
    const env = loadAppEnv({
      DAYSI_BRAND_SLUG: "daysi",
      DAYSI_RUNTIME_PROFILE: "cutover",
      DATABASE_URL: "postgres://daysi:test@localhost:5432/daysi",
      DAYSI_BOOKING_REPOSITORY: "memory",
      DAYSI_ORDER_REPOSITORY: "memory",
      DAYSI_CLINIC_DEFINITION_REPOSITORY: "bootstrap",
    });

    expect(env.DAYSI_RUNTIME_PROFILE).toBe("cutover");
    expect(env.DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE).toBe(false);
    expect(env.DAYSI_CLINIC_DEFINITION_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_CLINICAL_INTELLIGENCE_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_BOOKING_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_ORDER_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_MEMBERSHIP_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_SERVICE_PACKAGE_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_CREDIT_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_ANALYTICS_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_CONFIGURATION_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_GROWTH_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_ENGAGEMENT_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_OPERATIONS_REPOSITORY).toBe("postgres");
    expect(env.DAYSI_RELIABILITY_REPOSITORY).toBe("postgres");
  });

  it("honors an explicit bootstrap session override in cutover mode", () => {
    const env = loadAppEnv({
      DAYSI_BRAND_SLUG: "daysi",
      DAYSI_RUNTIME_PROFILE: "cutover",
      DATABASE_URL: "postgres://daysi:test@localhost:5432/daysi",
      DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE: "true",
    });

    expect(env.DAYSI_ALLOW_BOOTSTRAP_SESSION_EXCHANGE).toBe(true);
    expect(env.DAYSI_CLINIC_DEFINITION_REPOSITORY).toBe("postgres");
  });

  it("fails fast when Postgres-backed persistence is enabled without a database URL", () => {
    expect(() =>
      loadAppEnv({
        DAYSI_BRAND_SLUG: "daysi",
        DAYSI_RUNTIME_PROFILE: "cutover",
      }),
    ).toThrow(
      "DATABASE_URL is required when cutover mode or any Postgres-backed repository is enabled.",
    );

    expect(() =>
      loadAppEnv({
        DAYSI_BRAND_SLUG: "daysi",
        DAYSI_BOOKING_REPOSITORY: "postgres",
      }),
    ).toThrow(
      "DATABASE_URL is required when cutover mode or any Postgres-backed repository is enabled.",
    );
  });
});
