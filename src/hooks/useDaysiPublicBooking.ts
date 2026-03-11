import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDaysiBooking,
  DAYSI_DEFAULT_LOCATION_SLUG,
  type DaysiAvailabilitySlot,
  type DaysiCreateBookingInput,
  type DaysiCreateBookingResult,
  type DaysiPublicProduct,
  type DaysiPublicService,
  type DaysiPublicServicePackage,
  listDaysiPublicServices,
  listDaysiPublicProducts,
  listDaysiPublicServicePackages,
  searchDaysiAvailability,
} from "@/lib/daysi-public-api";

export function useDaysiBookableServices(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  return useQuery<DaysiPublicService[]>({
    queryKey: ["daysi-public-services", locationSlug],
    queryFn: () => listDaysiPublicServices(locationSlug),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDaysiPublicProducts(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  return useQuery<DaysiPublicProduct[]>({
    queryKey: ["daysi-public-products", locationSlug],
    queryFn: () => listDaysiPublicProducts(locationSlug),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDaysiPublicServicePackages(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  return useQuery<DaysiPublicServicePackage[]>({
    queryKey: ["daysi-public-service-packages", locationSlug],
    queryFn: () => listDaysiPublicServicePackages(locationSlug),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDaysiAvailability(input: {
  locationSlug?: string;
  serviceSlug: string | null;
  fromDate: string | null;
  toDate: string | null;
  pricingMode?: "retail" | "membership";
}) {
  return useQuery<DaysiAvailabilitySlot[]>({
    queryKey: [
      "daysi-availability",
      input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      input.serviceSlug,
      input.fromDate,
      input.toDate,
      input.pricingMode ?? "retail",
    ],
    queryFn: () =>
      searchDaysiAvailability({
        locationSlug: input.locationSlug,
        serviceSlug: input.serviceSlug!,
        fromDate: input.fromDate!,
        toDate: input.toDate!,
        pricingMode: input.pricingMode,
      }),
    enabled: !!input.serviceSlug && !!input.fromDate && !!input.toDate,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });
}

export function useCreateDaysiBooking() {
  const queryClient = useQueryClient();

  return useMutation<DaysiCreateBookingResult, Error, DaysiCreateBookingInput>({
    mutationFn: (input) => createDaysiBooking(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["daysi-availability", variables.locationSlug, variables.serviceSlug],
      });
    },
  });
}
