import {
  getServiceBySlug,
  searchAvailability,
  type AvailabilitySlot,
  type BookingPricingMode,
  type CatalogService,
} from "../../../packages/domain/src";

import { getLocationOperatingSchedule, getRuntimeClinicData } from "./clinic-runtime";
import type { AppEnv } from "./config";
import type { AppRepositories } from "./persistence/app-repositories";

export interface ServiceAvailabilityResult {
  service?: CatalogService;
  slots: AvailabilitySlot[];
  missingLocationSchedule: boolean;
}

export const getServiceAvailability = async (input: {
  env: AppEnv;
  repositories: AppRepositories;
  locationSlug: string;
  serviceSlug: string;
  fromDate: string;
  toDate: string;
  pricingMode: BookingPricingMode;
  preferredProviderSlug?: string;
}): Promise<ServiceAvailabilityResult> => {
  const clinicData = getRuntimeClinicData(input.env);
  const service = getServiceBySlug(clinicData.catalog, input.locationSlug, input.serviceSlug);
  const locationSchedule = getLocationOperatingSchedule(input.env, input.locationSlug);

  if (!service) {
    return {
      slots: [],
      missingLocationSchedule: false,
    };
  }

  if (!locationSchedule) {
    return {
      service,
      slots: [],
      missingLocationSchedule: true,
    };
  }

  return {
    service,
    slots: searchAvailability({
      locationSlug: input.locationSlug,
      service,
      fromDate: input.fromDate,
      toDate: input.toDate,
      pricingMode: input.pricingMode,
      preferredProviderSlug: input.preferredProviderSlug,
      locationSchedule,
      providers: clinicData.providers,
      machines: clinicData.machines,
      rooms: clinicData.rooms,
      existingReservations:
        await input.repositories.commerce.bookings.listReservationWindows(),
    }),
    missingLocationSchedule: false,
  };
};

export const findSlotById = async (input: {
  env: AppEnv;
  repositories: AppRepositories;
  slotId: string;
  locationSlug: string;
  serviceSlug: string;
  pricingMode: BookingPricingMode;
}): Promise<AvailabilitySlot | undefined> => {
  const slotDate = input.slotId.split("__").at(-1)?.slice(0, 10);
  if (!slotDate) {
    return undefined;
  }

  const { slots } = await getServiceAvailability({
    env: input.env,
    repositories: input.repositories,
    locationSlug: input.locationSlug,
    serviceSlug: input.serviceSlug,
    fromDate: slotDate,
    toDate: slotDate,
    pricingMode: input.pricingMode,
  });

  return slots.find((slot) => slot.slotId === input.slotId);
};
