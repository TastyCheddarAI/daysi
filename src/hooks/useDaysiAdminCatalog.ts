import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createDaysiAdminServicePackage,
  deleteDaysiAdminServicePackage,
  listDaysiAdminEducationOffers,
  listDaysiAdminProducts,
  listDaysiAdminServicePackages,
  listDaysiAdminServices,
  updateDaysiAdminServicePackage,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";

export function useDaysiAdminServices(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-admin-services", locationSlug],
    queryFn: async () => listDaysiAdminServices(session.token!, locationSlug),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

export function useDaysiAdminProducts(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-admin-products", locationSlug],
    queryFn: async () => listDaysiAdminProducts({ token: session.token!, locationSlug }),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

export function useDaysiAdminEducationOffers(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-admin-education-offers", locationSlug],
    queryFn: async () => listDaysiAdminEducationOffers(session.token!, locationSlug),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

export function useDaysiAdminServicePackages(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-admin-service-packages", locationSlug],
    queryFn: async () => listDaysiAdminServicePackages(session.token!, locationSlug),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

const packagesQueryKey = (locationSlug: string) => ["daysi-admin-service-packages", locationSlug];

export function useDaysiAdminCatalog(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  const servicesQuery = useDaysiAdminServices(locationSlug);
  const productsQuery = useDaysiAdminProducts(locationSlug);
  const educationQuery = useDaysiAdminEducationOffers(locationSlug);
  const packagesQuery = useDaysiAdminServicePackages(locationSlug);

  return {
    servicesQuery,
    productsQuery,
    educationQuery,
    packagesQuery,
  };
}

export function useCreateDaysiAdminServicePackage() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      slug: string;
      name: string;
      shortDescription: string;
      status: "draft" | "published";
      price: {
        currency: string;
        amountCents: number;
      };
      serviceCredits: Array<{
        serviceSlug: string;
        quantity: number;
      }>;
      featureTags?: string[];
    }) =>
      createDaysiAdminServicePackage({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        slug: input.slug,
        name: input.name,
        shortDescription: input.shortDescription,
        status: input.status,
        price: input.price,
        serviceCredits: input.serviceCredits,
        featureTags: input.featureTags,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: packagesQueryKey(input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG),
      });
      toast.success("Service package created successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create package");
    },
  });
}

export function useUpdateDaysiAdminServicePackage() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      slug: string;
      name?: string;
      shortDescription?: string;
      status?: "draft" | "published";
      price?: {
        currency: string;
        amountCents: number;
      };
      serviceCredits?: Array<{
        serviceSlug: string;
        quantity: number;
      }>;
      featureTags?: string[];
    }) =>
      updateDaysiAdminServicePackage({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        slug: input.slug,
        name: input.name,
        shortDescription: input.shortDescription,
        status: input.status,
        price: input.price,
        serviceCredits: input.serviceCredits,
        featureTags: input.featureTags,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: packagesQueryKey(input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG),
      });
      toast.success("Service package updated successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update package");
    },
  });
}

export function useDeleteDaysiAdminServicePackage() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug?: string; slug: string }) =>
      deleteDaysiAdminServicePackage({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        slug: input.slug,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: packagesQueryKey(input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG),
      });
      toast.success("Service package deleted successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete package");
    },
  });
}
