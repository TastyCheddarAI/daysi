import { describe, expect, it } from "vitest";

import type { CatalogService } from "./catalog";
import {
  cancelWaitlistEntry,
  createWaitlistEntry,
  filterWaitlistEntries,
  updateWaitlistStatus,
} from "./waitlist";

const service: CatalogService = {
  id: "svc_lhr",
  slug: "laser-hair-removal",
  variantSlug: "laser-hair-removal-full-body-60",
  categorySlug: "laser",
  locationSlug: "daysi-flagship",
  name: "Laser Hair Removal",
  shortDescription: "Flagship service",
  description: "Flagship service",
  durationMinutes: 60,
  bookable: true,
  price: {
    currency: "CAD",
    retailAmountCents: 29900,
    memberAmountCents: 24900,
    membershipRequired: false,
  },
  bookingPolicy: {
    cancellationWindowHours: 24,
    bufferMinutes: 15,
    requiresDeposit: false,
  },
  machineCapabilities: ["laser-hair-removal"],
  featureTags: [],
};

describe("waitlist domain", () => {
  it("creates waitlist entries with a bounded requested window", () => {
    const draft = createWaitlistEntry({
      service,
      customer: {
        firstName: "Jordan",
        lastName: "Lane",
        email: "Jordan@example.com",
      },
      preferredPricingMode: "retail",
      requestedWindow: {
        fromDate: "2026-03-10",
        toDate: "2026-03-12",
      },
    });

    expect(draft.waitlistEntry.status).toBe("active");
    expect(draft.waitlistEntry.customer.email).toBe("jordan@example.com");
    expect(draft.managementToken).toMatch(/^wmgmt_/);
  });

  it("updates and filters waitlist entries by lifecycle state", () => {
    const first = createWaitlistEntry({
      service,
      customer: {
        firstName: "Jordan",
        lastName: "Lane",
        email: "jordan@example.com",
      },
      preferredPricingMode: "retail",
      requestedWindow: {
        fromDate: "2026-03-10",
        toDate: "2026-03-12",
      },
      now: "2026-03-08T10:00:00.000Z",
    }).waitlistEntry;
    const second = createWaitlistEntry({
      service,
      customer: {
        firstName: "Taylor",
        lastName: "Stone",
        email: "taylor@example.com",
      },
      preferredPricingMode: "membership",
      requestedWindow: {
        fromDate: "2026-03-10",
        toDate: "2026-03-11",
      },
      now: "2026-03-08T11:00:00.000Z",
    }).waitlistEntry;

    const notified = updateWaitlistStatus({
      entry: first,
      status: "notified",
      note: "A matching slot is now open.",
      now: "2026-03-08T12:00:00.000Z",
    });
    const cancelled = cancelWaitlistEntry({
      entry: second,
      reason: "Customer found another appointment.",
      now: "2026-03-08T12:30:00.000Z",
    });

    const filtered = filterWaitlistEntries({
      entries: [cancelled, notified],
      locationSlug: "daysi-flagship",
      status: "notified",
    });

    expect(notified.statusHistory.at(-1)?.status).toBe("notified");
    expect(cancelled.status).toBe("cancelled");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe(notified.id);
  });
});
