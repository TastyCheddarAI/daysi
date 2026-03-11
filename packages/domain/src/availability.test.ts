import { describe, expect, it } from "vitest";

import type { CatalogService } from "./catalog";
import { searchAvailability } from "./availability";

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
  roomCapabilities: [],
  featureTags: [],
};

const roomService: CatalogService = {
  ...service,
  slug: "skin-rejuvenation",
  variantSlug: "skin-rejuvenation-photofacial-45",
  name: "Skin Rejuvenation",
  machineCapabilities: ["skin-rejuvenation"],
  roomCapabilities: ["treatment-room"],
};

describe("searchAvailability", () => {
  it("returns machine-aware slots for a standard retail service", () => {
    const slots = searchAvailability({
      locationSlug: "daysi-flagship",
      service,
      fromDate: "2026-03-09",
      toDate: "2026-03-09",
      pricingMode: "retail",
      locationSchedule: {
        locationSlug: "daysi-flagship",
        availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
      },
      providers: [
        {
          slug: "ava-chen",
          name: "Ava Chen",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["laser-hair-removal"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
        },
      ],
      machines: [
        {
          slug: "gentlemax-pro-a",
          name: "GentleMax Pro A",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["laser-hair-removal"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
          blockedWindows: [],
        },
      ],
      rooms: [],
      existingReservations: [],
    });

    expect(slots).toHaveLength(3);
    expect(slots[0]?.price.retailAmountCents).toBe(29900);
  });

  it("removes slots when the shared machine is already reserved", () => {
    const slots = searchAvailability({
      locationSlug: "daysi-flagship",
      service,
      fromDate: "2026-03-09",
      toDate: "2026-03-09",
      pricingMode: "retail",
      locationSchedule: {
        locationSlug: "daysi-flagship",
        availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
      },
      providers: [
        {
          slug: "ava-chen",
          name: "Ava Chen",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["laser-hair-removal"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
        },
      ],
      machines: [
        {
          slug: "gentlemax-pro-a",
          name: "GentleMax Pro A",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["laser-hair-removal"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
          blockedWindows: [],
        },
      ],
      rooms: [],
      existingReservations: [
        {
          bookingId: "bkg_existing",
          providerSlug: "ava-chen",
          machineSlug: "gentlemax-pro-a",
          startAt: "2026-03-09T09:00:00.000Z",
          endAt: "2026-03-09T10:00:00.000Z",
        },
      ],
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.startAt).toBe("2026-03-09T10:00:00.000Z");
  });

  it("does not overstate simultaneous capacity for a single shared machine", () => {
    const slots = searchAvailability({
      locationSlug: "daysi-flagship",
      service,
      fromDate: "2026-03-09",
      toDate: "2026-03-09",
      pricingMode: "retail",
      locationSchedule: {
        locationSlug: "daysi-flagship",
        availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
      },
      providers: [
        {
          slug: "ava-chen",
          name: "Ava Chen",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["laser-hair-removal"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
        },
        {
          slug: "maya-lopez",
          name: "Maya Lopez",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["laser-hair-removal"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
        },
      ],
      machines: [
        {
          slug: "gentlemax-pro-a",
          name: "GentleMax Pro A",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["laser-hair-removal"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
          blockedWindows: [],
        },
      ],
      rooms: [],
      existingReservations: [],
    });

    expect(slots.filter((slot) => slot.startAt === "2026-03-09T09:00:00.000Z")).toHaveLength(1);
    expect(slots.filter((slot) => slot.startAt === "2026-03-09T09:30:00.000Z")).toHaveLength(1);
    expect(slots.filter((slot) => slot.startAt === "2026-03-09T10:00:00.000Z")).toHaveLength(1);
  });

  it("removes slots when a required shared room is already reserved", () => {
    const slots = searchAvailability({
      locationSlug: "daysi-flagship",
      service: roomService,
      fromDate: "2026-03-09",
      toDate: "2026-03-09",
      pricingMode: "retail",
      locationSchedule: {
        locationSlug: "daysi-flagship",
        availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
      },
      providers: [
        {
          slug: "ava-chen",
          name: "Ava Chen",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["skin-rejuvenation"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
        },
        {
          slug: "maya-lopez",
          name: "Maya Lopez",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["skin-rejuvenation"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
        },
      ],
      machines: [
        {
          slug: "lasemd-ultra-a",
          name: "LaseMD Ultra A",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["skin-rejuvenation"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
          blockedWindows: [],
        },
        {
          slug: "lasemd-ultra-b",
          name: "LaseMD Ultra B",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["skin-rejuvenation"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
          blockedWindows: [],
        },
      ],
      rooms: [
        {
          slug: "treatment-suite-a",
          name: "Treatment Suite A",
          locationSlug: "daysi-flagship",
          capabilitySlugs: ["treatment-room"],
          availability: [{ daysOfWeek: [1], startMinute: 9 * 60, endMinute: 11 * 60 }],
          blockedWindows: [],
        },
      ],
      existingReservations: [
        {
          bookingId: "bkg_existing",
          providerSlug: "ava-chen",
          machineSlug: "lasemd-ultra-a",
          roomSlug: "treatment-suite-a",
          startAt: "2026-03-09T09:00:00.000Z",
          endAt: "2026-03-09T10:00:00.000Z",
        },
      ],
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.roomSlug).toBe("treatment-suite-a");
    expect(slots[0]?.startAt).toBe("2026-03-09T10:00:00.000Z");
  });
});
