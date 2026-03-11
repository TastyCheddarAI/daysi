import type { CatalogPriceSummary, CatalogService } from "./catalog";

export type BookingPricingMode = "retail" | "membership";

export interface RecurringTimeWindow {
  daysOfWeek: number[];
  startMinute: number;
  endMinute: number;
}

export interface TimeWindow {
  startAt: string;
  endAt: string;
}

export interface ProviderResource {
  slug: string;
  name: string;
  email?: string;
  locationSlug: string;
  serviceSlugs: string[];
  availability: RecurringTimeWindow[];
  blockedWindows?: TimeWindow[];
}

export interface MachineResource {
  slug: string;
  name: string;
  locationSlug: string;
  capabilitySlugs: string[];
  availability: RecurringTimeWindow[];
  blockedWindows: TimeWindow[];
}

export interface RoomResource {
  slug: string;
  name: string;
  locationSlug: string;
  capabilitySlugs: string[];
  availability: RecurringTimeWindow[];
  blockedWindows: TimeWindow[];
}

export interface LocationOperatingSchedule {
  locationSlug: string;
  availability: RecurringTimeWindow[];
}

export interface BookingWindowReservation {
  bookingId: string;
  providerSlug: string;
  machineSlug: string;
  roomSlug?: string;
  startAt: string;
  endAt: string;
}

export interface AvailabilitySlot {
  slotId: string;
  locationSlug: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  providerSlug: string;
  providerName: string;
  machineSlug: string;
  machineName: string;
  roomSlug?: string;
  roomName?: string;
  startAt: string;
  endAt: string;
  price: CatalogPriceSummary;
}

export interface AvailabilitySearchInput {
  locationSlug: string;
  service: CatalogService;
  fromDate: string;
  toDate: string;
  pricingMode: BookingPricingMode;
  preferredProviderSlug?: string;
  locationSchedule: LocationOperatingSchedule;
  providers: ProviderResource[];
  machines: MachineResource[];
  rooms: RoomResource[];
  existingReservations: BookingWindowReservation[];
}

const SLOT_STEP_MINUTES = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RANGE_LIMIT_DAYS = 14;

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const addMinutesUtc = (value: Date, minutes: number): Date =>
  new Date(value.getTime() + minutes * 60 * 1000);

const toUtcDateAtMinute = (dateOnly: string, minuteOfDay: number): Date => {
  const base = new Date(`${dateOnly}T00:00:00.000Z`);
  return addMinutesUtc(base, minuteOfDay);
};

const overlap = (startA: Date, endA: Date, startB: Date, endB: Date): boolean =>
  startA < endB && startB < endA;

const hasRecurringCoverage = (
  windows: RecurringTimeWindow[],
  dateOnly: string,
  startMinute: number,
  endMinute: number,
): boolean => {
  const dayOfWeek = new Date(`${dateOnly}T00:00:00.000Z`).getUTCDay();
  return windows.some(
    (window) =>
      window.daysOfWeek.includes(dayOfWeek) &&
      window.startMinute <= startMinute &&
      window.endMinute >= endMinute,
  );
};

const hasBlockedWindow = (
  windows: TimeWindow[],
  slotStart: Date,
  slotEnd: Date,
): boolean =>
  windows.some((window) =>
    overlap(slotStart, slotEnd, new Date(window.startAt), new Date(window.endAt)),
  );

export const buildSlotId = (input: {
  locationSlug: string;
  serviceVariantSlug: string;
  providerSlug: string;
  machineSlug: string;
  roomSlug?: string;
  startAt: string;
}): string =>
  [
    input.locationSlug,
    input.serviceVariantSlug,
    input.providerSlug,
    input.machineSlug,
    ...(input.roomSlug ? [input.roomSlug] : []),
    input.startAt,
  ].join("__");

export const searchAvailability = (input: AvailabilitySearchInput): AvailabilitySlot[] => {
  if (input.fromDate > input.toDate) {
    throw new Error("Availability search range is invalid.");
  }

  const startDay = new Date(`${input.fromDate}T00:00:00.000Z`);
  const endDay = new Date(`${input.toDate}T00:00:00.000Z`);
  const spanDays = Math.floor((endDay.getTime() - startDay.getTime()) / DAY_IN_MS) + 1;

  if (spanDays < 1 || spanDays > RANGE_LIMIT_DAYS) {
    throw new Error("Availability search range must be between 1 and 14 days.");
  }

  if (input.service.price.membershipRequired && input.pricingMode !== "membership") {
    return [];
  }

  const locationProviders = input.providers.filter(
    (provider) =>
      provider.locationSlug === input.locationSlug &&
      provider.serviceSlugs.includes(input.service.slug) &&
      (!input.preferredProviderSlug || provider.slug === input.preferredProviderSlug),
  );
  const compatibleMachines = input.machines.filter(
    (machine) =>
      machine.locationSlug === input.locationSlug &&
      input.service.machineCapabilities.every((capability) =>
        machine.capabilitySlugs.includes(capability),
      ),
  );
  const roomCapabilities = input.service.roomCapabilities ?? [];
  const compatibleRooms =
    roomCapabilities.length === 0
      ? [undefined]
      : input.rooms.filter(
          (room) =>
            room.locationSlug === input.locationSlug &&
            roomCapabilities.every((capability) => room.capabilitySlugs.includes(capability)),
        );

  const slots: AvailabilitySlot[] = [];
  const latestStartMinute = 24 * 60 - input.service.durationMinutes;

  for (let dayOffset = 0; dayOffset < spanDays; dayOffset += 1) {
    const currentDay = new Date(startDay.getTime() + dayOffset * DAY_IN_MS);
    const dateOnly = toDateOnly(currentDay);

    for (let startMinute = 0; startMinute <= latestStartMinute; startMinute += SLOT_STEP_MINUTES) {
      const endMinute = startMinute + input.service.durationMinutes;

      if (
        !hasRecurringCoverage(
          input.locationSchedule.availability,
          dateOnly,
          startMinute,
          endMinute,
        )
      ) {
        continue;
      }

      const slotStart = toUtcDateAtMinute(dateOnly, startMinute);
      const slotEnd = toUtcDateAtMinute(dateOnly, endMinute);
      const startAt = slotStart.toISOString();
      const endAt = slotEnd.toISOString();
      const candidates: AvailabilitySlot[] = [];

      for (const provider of locationProviders) {
        const providerConflict =
          !hasRecurringCoverage(provider.availability, dateOnly, startMinute, endMinute) ||
          input.existingReservations.some(
            (reservation) =>
              reservation.providerSlug === provider.slug &&
              overlap(
                slotStart,
                slotEnd,
                new Date(reservation.startAt),
                new Date(reservation.endAt),
              ),
          ) ||
          hasBlockedWindow(provider.blockedWindows ?? [], slotStart, slotEnd);

        if (providerConflict) {
          continue;
        }

        for (const machine of compatibleMachines) {
          const machineConflict =
            !hasRecurringCoverage(machine.availability, dateOnly, startMinute, endMinute) ||
            input.existingReservations.some(
              (reservation) =>
                reservation.machineSlug === machine.slug &&
                overlap(
                  slotStart,
                  slotEnd,
                  new Date(reservation.startAt),
                  new Date(reservation.endAt),
                ),
            ) ||
            hasBlockedWindow(machine.blockedWindows, slotStart, slotEnd);

          if (machineConflict) {
            continue;
          }

          for (const room of compatibleRooms) {
            const roomConflict =
              (room &&
                (!hasRecurringCoverage(room.availability, dateOnly, startMinute, endMinute) ||
                  input.existingReservations.some(
                    (reservation) =>
                      reservation.roomSlug === room.slug &&
                      overlap(
                        slotStart,
                        slotEnd,
                        new Date(reservation.startAt),
                        new Date(reservation.endAt),
                      ),
                  ) ||
                  hasBlockedWindow(room.blockedWindows, slotStart, slotEnd))) ??
              false;

            if (roomConflict) {
              continue;
            }

            candidates.push({
              slotId: buildSlotId({
                locationSlug: input.locationSlug,
                serviceVariantSlug: input.service.variantSlug,
                providerSlug: provider.slug,
                machineSlug: machine.slug,
                roomSlug: room?.slug,
                startAt,
              }),
              locationSlug: input.locationSlug,
              serviceSlug: input.service.slug,
              serviceVariantSlug: input.service.variantSlug,
              providerSlug: provider.slug,
              providerName: provider.name,
              machineSlug: machine.slug,
              machineName: machine.name,
              roomSlug: room?.slug,
              roomName: room?.name,
              startAt,
              endAt,
              price: input.service.price,
            });
          }
        }
      }

      const usedProviders = new Set<string>();
      const usedMachines = new Set<string>();
      const usedRooms = new Set<string>();

      for (const candidate of candidates) {
        if (
          usedProviders.has(candidate.providerSlug) ||
          usedMachines.has(candidate.machineSlug) ||
          (candidate.roomSlug ? usedRooms.has(candidate.roomSlug) : false)
        ) {
          continue;
        }

        usedProviders.add(candidate.providerSlug);
        usedMachines.add(candidate.machineSlug);
        if (candidate.roomSlug) {
          usedRooms.add(candidate.roomSlug);
        }

        slots.push(candidate);
      }
    }
  }

  return slots
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .slice(0, 48);
};
