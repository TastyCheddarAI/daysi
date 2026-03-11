import { describe, expect, it } from "vitest";

import type { AvailabilitySlot } from "./availability";
import type { CatalogService } from "./catalog";
import {
  cancelBookingRecord,
  createBookingRecord,
  resolveRebookingSearchWindow,
} from "./bookings";

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

const slot: AvailabilitySlot = {
  slotId: "daysi-flagship__laser-hair-removal-full-body-60__ava-chen__gentlemax-pro-a__2026-03-09T10:00:00.000Z",
  locationSlug: "daysi-flagship",
  serviceSlug: "laser-hair-removal",
  serviceVariantSlug: "laser-hair-removal-full-body-60",
  providerSlug: "ava-chen",
  providerName: "Ava Chen",
  machineSlug: "gentlemax-pro-a",
  machineName: "GentleMax Pro A",
  startAt: "2026-03-09T10:00:00.000Z",
  endAt: "2026-03-09T11:00:00.000Z",
  price: service.price,
};

describe("booking domain", () => {
  it("creates a booking with member pricing when requested", () => {
    const draft = createBookingRecord({
      service,
      slot,
      customer: {
        firstName: "Taylor",
        lastName: "Stone",
        email: "taylor@example.com",
      },
      sourceAssessmentId: "srec_123",
      sourceTreatmentPlanId: "tplan_123",
      requestedPricingMode: "membership",
    });

    expect(draft.booking.charge.appliedPricingMode).toBe("membership");
    expect(draft.booking.charge.finalAmountCents).toBe(24900);
    expect(draft.booking.sourceAssessmentId).toBe("srec_123");
    expect(draft.booking.sourceTreatmentPlanId).toBe("tplan_123");
    expect(draft.managementToken).toMatch(/^mgmt_/);
  });

  it("cancels an existing booking cleanly", () => {
    const draft = createBookingRecord({
      service,
      slot,
      customer: {
        firstName: "Taylor",
        lastName: "Stone",
        email: "taylor@example.com",
      },
      requestedPricingMode: "retail",
    });

    const cancelled = cancelBookingRecord({
      booking: draft.booking,
      reason: "Customer requested cancellation.",
      now: "2026-03-08T10:00:00.000Z",
    });

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledReason).toBe("Customer requested cancellation.");
    expect(cancelled.statusHistory.at(-1)?.status).toBe("cancelled");
  });

  it("builds a bounded rebooking search window", () => {
    const draft = createBookingRecord({
      service,
      slot,
      customer: {
        firstName: "Taylor",
        lastName: "Stone",
        email: "taylor@example.com",
      },
      requestedPricingMode: "retail",
    });

    const window = resolveRebookingSearchWindow({
      booking: draft.booking,
      fromDate: "2026-03-10",
      toDate: "2026-03-16",
    });

    expect(window.fromDate).toBe("2026-03-10");
    expect(window.toDate).toBe("2026-03-16");
  });
});
