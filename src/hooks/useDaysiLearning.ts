import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  claimFreeDaysiEducationOffer,
  createDaysiEducationEnrollment,
  fetchDaysiMyEducationCertificates,
  fetchDaysiMyEducationEnrollments,
  fetchDaysiMyEducationEntitlements,
  listDaysiPublicEducationOffers,
  type DaysiLearningCertificate,
  type DaysiLearningEnrollmentView,
  type DaysiLearningEntitlement,
  type DaysiPublicEducationOffer,
  updateDaysiEducationProgress,
} from "@/lib/daysi-learning-api";
import type { DaysiAuthUser } from "@/lib/daysi-auth-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

export function useDaysiEducationCatalog(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  return useQuery<DaysiPublicEducationOffer[]>({
    queryKey: ["daysi-education-catalog", locationSlug],
    queryFn: () => listDaysiPublicEducationOffers(locationSlug),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDaysiEducationEntitlements(token?: string) {
  return useQuery<DaysiLearningEntitlement[]>({
    queryKey: ["daysi-education-entitlements", token],
    queryFn: () => fetchDaysiMyEducationEntitlements(token!),
    enabled: !!token,
    staleTime: 1000 * 30,
  });
}

export function useDaysiEducationEnrollments(token?: string) {
  return useQuery<DaysiLearningEnrollmentView[]>({
    queryKey: ["daysi-education-enrollments", token],
    queryFn: () => fetchDaysiMyEducationEnrollments(token!),
    enabled: !!token,
    staleTime: 1000 * 30,
  });
}

export function useDaysiEducationCertificates(token?: string) {
  return useQuery<DaysiLearningCertificate[]>({
    queryKey: ["daysi-education-certificates", token],
    queryFn: () => fetchDaysiMyEducationCertificates(token!),
    enabled: !!token,
    staleTime: 1000 * 30,
  });
}

export function useCreateDaysiEducationEnrollment(token?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    DaysiLearningEnrollmentView,
    Error,
    { locationSlug: string; offerSlug: string }
  >({
    mutationFn: (input) => {
      if (!token) {
        throw new Error("A Daysi session is required before enrollment.");
      }

      return createDaysiEducationEnrollment(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["daysi-education-enrollments", token],
      });
      queryClient.invalidateQueries({
        queryKey: ["daysi-education-certificates", token],
      });
    },
  });
}

export function useClaimFreeDaysiEducationOffer(token?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    {
      locationSlug: string;
      offer: DaysiPublicEducationOffer;
      user: DaysiAuthUser;
    }
  >({
    mutationFn: (input) => {
      if (!token) {
        throw new Error("A Daysi session is required before claiming access.");
      }

      return claimFreeDaysiEducationOffer(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["daysi-education-entitlements", token],
      });
      queryClient.invalidateQueries({
        queryKey: ["daysi-account-orders", token],
      });
    },
  });
}

export function useUpdateDaysiEducationProgress(token?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    DaysiLearningEnrollmentView,
    Error,
    {
      lessonId: string;
      enrollmentId: string;
      status: "not_started" | "in_progress" | "completed";
      percentComplete?: number;
    }
  >({
    mutationFn: (input) => {
      if (!token) {
        throw new Error("A Daysi session is required before updating progress.");
      }

      return updateDaysiEducationProgress(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["daysi-education-enrollments", token],
      });
      queryClient.invalidateQueries({
        queryKey: ["daysi-education-certificates", token],
      });
    },
  });
}
