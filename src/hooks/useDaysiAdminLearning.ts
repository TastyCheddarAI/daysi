import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import {
  createDaysiAdminEducationGrant,
  createDaysiAdminEducationOffer,
  fetchDaysiAdminLearningStats,
  listDaysiAdminEducationOffers,
  listDaysiAdminLearningCertificates,
  listDaysiAdminLearningEnrollments,
  listDaysiAdminLearningEntitlements,
  updateDaysiAdminEducationOffer,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

const invalidateLearningQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  locationSlug: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-learning-offers", locationSlug] });
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-learning-stats", locationSlug] });
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-learning-enrollments", locationSlug] });
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-learning-certificates", locationSlug] });
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-learning-entitlements"] });
};

export function useDaysiAdminLearning(input: {
  locationSlug?: string;
  search?: string;
  offerSlug?: string;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  const offersQuery = useQuery({
    queryKey: ["daysi-admin-learning-offers", locationSlug],
    queryFn: async () => listDaysiAdminEducationOffers(session.token!, locationSlug),
    enabled: session.ready,
    staleTime: 60_000,
  });

  const statsQuery = useQuery({
    queryKey: ["daysi-admin-learning-stats", locationSlug],
    queryFn: async () => fetchDaysiAdminLearningStats({ token: session.token!, locationSlug }),
    enabled: session.ready,
    staleTime: 60_000,
  });

  const enrollmentsQuery = useQuery({
    queryKey: [
      "daysi-admin-learning-enrollments",
      locationSlug,
      input.offerSlug ?? "",
      input.search ?? "",
    ],
    queryFn: async () =>
      listDaysiAdminLearningEnrollments({
        token: session.token!,
        locationSlug,
        offerSlug: input.offerSlug,
        search: input.search,
      }),
    enabled: session.ready,
    staleTime: 30_000,
  });

  const certificatesQuery = useQuery({
    queryKey: [
      "daysi-admin-learning-certificates",
      locationSlug,
      input.offerSlug ?? "",
      input.search ?? "",
    ],
    queryFn: async () =>
      listDaysiAdminLearningCertificates({
        token: session.token!,
        locationSlug,
        offerSlug: input.offerSlug,
        search: input.search,
      }),
    enabled: session.ready,
    staleTime: 30_000,
  });

  const entitlementsQuery = useQuery({
    queryKey: ["daysi-admin-learning-entitlements", input.search ?? ""],
    queryFn: async () =>
      listDaysiAdminLearningEntitlements({
        token: session.token!,
        customerEmail: input.search?.includes("@") ? input.search.trim() : undefined,
      }),
    enabled: session.ready,
    staleTime: 30_000,
  });

  return useMemo(
    () => ({
      locationSlug,
      offersQuery,
      statsQuery,
      enrollmentsQuery,
      certificatesQuery,
      entitlementsQuery,
    }),
    [
      certificatesQuery,
      entitlementsQuery,
      enrollmentsQuery,
      locationSlug,
      offersQuery,
      statsQuery,
    ],
  );
}

export function useCreateDaysiAdminEducationOffer() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      slug: string;
      title: string;
      shortDescription: string;
      moduleSlugs: string[];
      membershipEligible: boolean;
      staffGrantEnabled: boolean;
      status: "draft" | "published";
      price: {
        currency: string;
        amountCents: number;
        isFree: boolean;
      };
    }) =>
      createDaysiAdminEducationOffer({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        slug: input.slug,
        title: input.title,
        shortDescription: input.shortDescription,
        moduleSlugs: input.moduleSlugs,
        membershipEligible: input.membershipEligible,
        staffGrantEnabled: input.staffGrantEnabled,
        status: input.status,
        price: input.price,
      }),
    onSuccess: (_offer, input) => {
      invalidateLearningQueries(
        queryClient,
        input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      );
    },
  });
}

export function useUpdateDaysiAdminEducationOffer() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      slug: string;
      title?: string;
      shortDescription?: string;
      moduleSlugs?: string[];
      membershipEligible?: boolean;
      staffGrantEnabled?: boolean;
      status?: "draft" | "published";
      price?: {
        currency: string;
        amountCents: number;
        isFree: boolean;
      };
    }) =>
      updateDaysiAdminEducationOffer({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        slug: input.slug,
        title: input.title,
        shortDescription: input.shortDescription,
        moduleSlugs: input.moduleSlugs,
        membershipEligible: input.membershipEligible,
        staffGrantEnabled: input.staffGrantEnabled,
        status: input.status,
        price: input.price,
      }),
    onSuccess: (_offer, input) => {
      invalidateLearningQueries(
        queryClient,
        input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      );
    },
  });
}

export function useCreateDaysiAdminEducationGrant() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      offerSlug: string;
      customerEmail: string;
      customerName: string;
      actorUserId?: string;
    }) =>
      createDaysiAdminEducationGrant({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        offerSlug: input.offerSlug,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        actorUserId: input.actorUserId,
      }),
    onSuccess: (_entitlement, input) => {
      invalidateLearningQueries(
        queryClient,
        input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      );
    },
  });
}
