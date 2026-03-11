import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelDaysiAdminBooking,
  createDaysiAdminBooking,
  createDaysiAdminMembershipPlan,
  createDaysiAdminProduct,
  createDaysiAdminService,
  deleteDaysiAdminMembershipPlan,
  deleteDaysiAdminProduct,
  deleteDaysiAdminService,
  fetchDaysiCustomerContext,
  fetchDaysiLocationFinanceDashboard,
  fetchDaysiMembershipPerformanceReport,
  fetchDaysiOperationsPerformanceReport,
  fetchDaysiRevenueSummaryReport,
  fetchDaysiWebAnalyticsReport,
  getDaysiBookingRebookingOptions,
  listDaysiAdminBookings,
  listDaysiAdminMembershipPlans,
  listDaysiAdminProducts,
  listDaysiAdminProviders,
  listDaysiAdminServices,
  pauseDaysiAdminService,
  rescheduleDaysiAdminBooking,
  type DaysiAdminBookingInput,
  type DaysiAdminBookingRecord,
  type DaysiAdminProduct,
  type DaysiAdminProductInput,
  type DaysiAdminServiceInput,
  type DaysiLocationFinanceDashboard,
  type DaysiAdminProviderSummary,
  type DaysiWebsiteAnalyticsReport,
  type DaysiPublicService,
  type DaysiMembershipPlan,
  type DaysiMembershipPlanInput,
  updateDaysiAdminMembershipPlan,
  updateDaysiAdminProduct,
  updateDaysiAdminProvider,
  updateDaysiAdminService,
} from "@/lib/daysi-admin-api";
import {
  DAYSI_DEFAULT_LOCATION_SLUG,
  DAYSI_API_BASE_URL,
  formatDaysiAvailabilityTime,
  groupAvailabilitySlotsByDate,
} from "@/lib/daysi-public-api";
import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";

export type DaysiAdminBookingStatus = DaysiAdminBookingRecord["status"];

const adminBookingsKey = (
  locationSlug: string,
  fromDate?: string,
  toDate?: string,
  status?: DaysiAdminBookingStatus,
  providerSlug?: string,
  customerEmail?: string,
) => [
  "daysi-admin-bookings",
  locationSlug,
  fromDate ?? "",
  toDate ?? "",
  status ?? "all",
  providerSlug ?? "all",
  customerEmail ?? "",
] as const;

export function useDaysiAdminBookings(input: {
  locationSlug?: string;
  fromDate?: string;
  toDate?: string;
  status?: DaysiAdminBookingStatus;
  providerSlug?: string;
  customerEmail?: string;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: adminBookingsKey(
      locationSlug,
      input.fromDate,
      input.toDate,
      input.status,
      input.providerSlug,
      input.customerEmail,
    ),
    queryFn: async () =>
      listDaysiAdminBookings(session.token!, {
        locationSlug,
        fromDate: input.fromDate,
        toDate: input.toDate,
        status: input.status,
        providerSlug: input.providerSlug,
        customerEmail: input.customerEmail,
      }),
    enabled: session.ready,
    refetchInterval: 30_000,
  });
}

export function useDaysiAdminProviders(locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-admin-providers", locationSlug],
    queryFn: async () => listDaysiAdminProviders(session.token!, locationSlug),
    enabled: session.ready,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateDaysiAdminProvider() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      providerSlug: string;
      locationSlug?: string;
      commissionPercent?: number;
      serviceSlugs?: string[];
    }) => {
      if (!session.token) throw new Error("Not authenticated");
      return updateDaysiAdminProvider({
        token: session.token,
        ...input,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["daysi-admin-providers", variables.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG],
      });
    },
  });
}

export function useDaysiAdminCustomerContext(input: {
  locationSlug: string;
  customerEmail?: string;
}) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-admin-customer-context", input.locationSlug, input.customerEmail ?? ""],
    queryFn: async () =>
      fetchDaysiCustomerContext({
        token: session.token!,
        locationSlug: input.locationSlug,
        customerEmail: input.customerEmail!,
      }),
    enabled: session.ready && !!input.customerEmail,
    staleTime: 60_000,
  });
}

export function useDaysiRevenueSummaryReport(input: {
  locationSlug?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: ["daysi-revenue-summary-report", locationSlug, input.fromDate ?? "", input.toDate ?? ""],
    queryFn: async () =>
      fetchDaysiRevenueSummaryReport({
        token: session.token!,
        locationSlug,
        fromDate: input.fromDate,
        toDate: input.toDate,
      }),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

export function useDaysiMembershipPerformanceReport(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-membership-performance-report", locationSlug],
    queryFn: async () =>
      fetchDaysiMembershipPerformanceReport({
        token: session.token!,
        locationSlug,
      }),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

export function useDaysiLocationFinanceDashboard(
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: ["daysi-location-finance-dashboard", locationSlug],
    queryFn: async () =>
      fetchDaysiLocationFinanceDashboard({
        token: session.token!,
        locationSlug,
      }),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

export function useDaysiOperationsPerformanceReport(input: {
  locationSlug?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: [
      "daysi-operations-performance-report",
      locationSlug,
      input.fromDate ?? "",
      input.toDate ?? "",
    ],
    queryFn: async () =>
      fetchDaysiOperationsPerformanceReport({
        token: session.token!,
        locationSlug,
        fromDate: input.fromDate,
        toDate: input.toDate,
      }),
    enabled: session.ready,
    staleTime: 60_000,
  });
}

export function useDaysiWebAnalyticsReport(input: {
  locationSlug?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: ["daysi-web-analytics-report", locationSlug, input.fromDate ?? "", input.toDate ?? ""],
    queryFn: async () =>
      fetchDaysiWebAnalyticsReport({
        token: session.token!,
        locationSlug,
        fromDate: input.fromDate,
        toDate: input.toDate,
      }),
    enabled: session.ready,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useDaysiBookingRebookingOptions(input: {
  bookingId?: string;
  fromDate?: string;
  toDate?: string;
  pricingMode?: "retail" | "membership";
}) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: [
      "daysi-booking-rebooking-options",
      input.bookingId ?? "",
      input.fromDate ?? "",
      input.toDate ?? "",
      input.pricingMode ?? "retail",
    ],
    queryFn: async () =>
      getDaysiBookingRebookingOptions({
        token: session.token!,
        bookingId: input.bookingId!,
        fromDate: input.fromDate,
        toDate: input.toDate,
        pricingMode: input.pricingMode,
      }),
    enabled: session.ready && !!input.bookingId,
  });
}

const invalidateAdminBookingQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  locationSlug: string,
  customerEmail: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-bookings"] });
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-customer-context", locationSlug, customerEmail] });
  queryClient.invalidateQueries({ queryKey: ["daysi-revenue-summary-report"] });
  queryClient.invalidateQueries({ queryKey: ["daysi-location-finance-dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["daysi-membership-performance-report"] });
  queryClient.invalidateQueries({ queryKey: ["daysi-operations-performance-report"] });
};

export function useCancelDaysiAdminBooking() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { bookingId: string; locationSlug: string; customerEmail: string; reason?: string }) =>
      cancelDaysiAdminBooking({
        token: session.token!,
        bookingId: input.bookingId,
        reason: input.reason,
      }),
    onSuccess: (_booking, input) => {
      invalidateAdminBookingQueries(queryClient, input.locationSlug, input.customerEmail);
    },
  });
}

export function useRescheduleDaysiAdminBooking() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      locationSlug: string;
      customerEmail: string;
      slotId: string;
      pricingMode?: "retail" | "membership";
    }) =>
      rescheduleDaysiAdminBooking({
        token: session.token!,
        bookingId: input.bookingId,
        slotId: input.slotId,
        pricingMode: input.pricingMode,
      }),
    onSuccess: (_booking, input) => {
      invalidateAdminBookingQueries(queryClient, input.locationSlug, input.customerEmail);
      queryClient.invalidateQueries({
        queryKey: ["daysi-booking-rebooking-options", input.bookingId],
      });
    },
  });
}

export const getDaysiAdminBookingStatusInfo = (
  status: DaysiAdminBookingStatus,
): {
  label: string;
  color: string;
  bgColor: string;
} =>
  status === "confirmed"
    ? {
        label: "Confirmed",
        color: "text-green-700",
        bgColor: "bg-green-100",
      }
    : {
        label: "Cancelled",
        color: "text-slate-700",
        bgColor: "bg-slate-200",
      };

export const getDaysiAdminBookingCustomerName = (
  booking: DaysiAdminBookingRecord,
): string =>
  `${booking.customer.firstName} ${booking.customer.lastName}`.trim() || booking.customer.email;

export const getDaysiAdminBookingDuration = (booking: DaysiAdminBookingRecord): number =>
  Math.max(
    0,
    Math.round(
      (new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 60000,
    ),
  );

export const formatDaysiAdminSlotTime = (isoTimestamp: string): string =>
  formatDaysiAvailabilityTime(isoTimestamp);

export const getDaysiBookingOriginInfo = (booking: DaysiAdminBookingRecord) => {
  if (booking.sourceTreatmentPlanId) {
    return { label: "Treatment Plan" };
  }

  if (booking.sourceAssessmentId) {
    return { label: "Skin Analysis" };
  }

  if (booking.charge.appliedPricingMode === "membership") {
    return { label: "Member Booking" };
  }

  return { label: "Direct Booking" };
};

export const useDaysiProviderMap = (providers: DaysiAdminProviderSummary[] | undefined) =>
  useMemo(() => {
    const providerMap = new Map<string, DaysiAdminProviderSummary>();
    for (const provider of providers ?? []) {
      providerMap.set(provider.providerSlug, provider);
    }
    return providerMap;
  }, [providers]);

// Service Management Hooks

const adminServicesKey = (locationSlug: string) => ["daysi-admin-services", locationSlug] as const;

export function useDaysiAdminServices(locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: adminServicesKey(locationSlug),
    queryFn: async () => listDaysiAdminServices(session.token!, locationSlug),
    enabled: session.ready,
    staleTime: 30_000,
  });
}

export function useCreateDaysiAdminService() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug: string; service: DaysiAdminServiceInput }) =>
      createDaysiAdminService({
        token: session.token!,
        locationSlug: input.locationSlug,
        service: input.service,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminServicesKey(input.locationSlug) });
    },
  });
}

export function useUpdateDaysiAdminService() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      serviceSlug: string;
      service: Partial<DaysiAdminServiceInput>;
    }) =>
      updateDaysiAdminService({
        token: session.token!,
        locationSlug: input.locationSlug,
        serviceSlug: input.serviceSlug,
        service: input.service,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminServicesKey(input.locationSlug) });
    },
  });
}

export function useDeleteDaysiAdminService() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug: string; serviceSlug: string }) =>
      deleteDaysiAdminService({
        token: session.token!,
        locationSlug: input.locationSlug,
        serviceSlug: input.serviceSlug,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminServicesKey(input.locationSlug) });
    },
  });
}

export function usePauseDaysiAdminService() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug: string; serviceSlug: string; paused: boolean }) =>
      pauseDaysiAdminService({
        token: session.token!,
        locationSlug: input.locationSlug,
        serviceSlug: input.serviceSlug,
        paused: input.paused,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminServicesKey(input.locationSlug) });
    },
  });
}

// Admin Booking CRUD Hooks

export function useCreateDaysiAdminBooking() {
  const session = useDaysiAdminSession();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      customer: { email: string; name?: string; phone?: string };
      serviceSlug: string;
      providerSlug: string;
      startAt: string;
      endAt: string;
      notes?: string;
    }) => {
      const response = await fetch(`${DAYSI_API_BASE_URL}/v1/admin/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create booking" }));
        throw new Error(error.message);
      }
      return response.json();
    },
  });
}

export function useUpdateDaysiAdminBooking() {
  const session = useDaysiAdminSession();

  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      locationSlug: string;
      updates: {
        serviceSlug?: string;
        providerSlug?: string;
        startAt?: string;
        endAt?: string;
        notes?: string;
      };
    }) => {
      const response = await fetch(`${DAYSI_API_BASE_URL}/v1/admin/bookings/${input.bookingId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...input.updates, locationSlug: input.locationSlug }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update booking" }));
        throw new Error(error.message);
      }
      return response.json();
    },
  });
}

export function useDeleteDaysiAdminBooking() {
  const session = useDaysiAdminSession();

  return useMutation({
    mutationFn: async (input: { bookingId: string; locationSlug: string }) => {
      const response = await fetch(
        `${DAYSI_API_BASE_URL}/v1/admin/bookings/${input.bookingId}?locationSlug=${input.locationSlug}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.token!}`,
          },
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete booking" }));
        throw new Error(error.message);
      }
      return response.json();
    },
  });
}

export { groupAvailabilitySlotsByDate };
export type {
  DaysiAdminBookingRecord,
  DaysiAdminProviderSummary,
  DaysiLocationFinanceDashboard,
  DaysiWebsiteAnalyticsReport,
  DaysiMembershipPlan,
  DaysiMembershipPlanInput,
};

// Membership Plan Management Hooks

const adminMembershipPlansKey = (locationSlug: string) => ["daysi-admin-membership-plans", locationSlug] as const;

export function useDaysiAdminMembershipPlans(locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: adminMembershipPlansKey(locationSlug),
    queryFn: async () => listDaysiAdminMembershipPlans({ token: session.token!, locationSlug }),
    enabled: session.ready,
    staleTime: 30_000,
  });
}

export function useCreateDaysiAdminMembershipPlan() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug: string; data: DaysiMembershipPlanInput }) =>
      createDaysiAdminMembershipPlan({
        token: session.token!,
        locationSlug: input.locationSlug,
        data: input.data,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminMembershipPlansKey(input.locationSlug) });
      queryClient.invalidateQueries({ queryKey: ["daysi-membership-performance-report", input.locationSlug] });
    },
  });
}

export function useUpdateDaysiAdminMembershipPlan() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      planSlug: string;
      data: Partial<DaysiMembershipPlanInput>;
    }) =>
      updateDaysiAdminMembershipPlan({
        token: session.token!,
        locationSlug: input.locationSlug,
        planSlug: input.planSlug,
        data: input.data,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminMembershipPlansKey(input.locationSlug) });
      queryClient.invalidateQueries({ queryKey: ["daysi-membership-performance-report", input.locationSlug] });
    },
  });
}

export function useDeleteDaysiAdminMembershipPlan() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug: string; planSlug: string }) =>
      deleteDaysiAdminMembershipPlan({
        token: session.token!,
        locationSlug: input.locationSlug,
        planSlug: input.planSlug,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminMembershipPlansKey(input.locationSlug) });
      queryClient.invalidateQueries({ queryKey: ["daysi-membership-performance-report", input.locationSlug] });
    },
  });
}

// Product hooks
const adminProductsKey = (locationSlug: string) => ["daysi-admin-products", locationSlug] as const;

export function useDaysiAdminProducts(locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG) {
  const session = useDaysiAdminSession();

  return useQuery({
    queryKey: adminProductsKey(locationSlug),
    queryFn: async () => listDaysiAdminProducts({ token: session.token!, locationSlug }),
    enabled: session.ready,
    staleTime: 30_000,
  });
}

export function useCreateDaysiAdminProduct() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug: string; product: DaysiAdminProductInput }) =>
      createDaysiAdminProduct({
        token: session.token!,
        locationSlug: input.locationSlug,
        product: input.product,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminProductsKey(input.locationSlug) });
    },
  });
}

export function useUpdateDaysiAdminProduct() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      slug: string;
      product: Partial<DaysiAdminProductInput>;
    }) =>
      updateDaysiAdminProduct({
        token: session.token!,
        locationSlug: input.locationSlug,
        slug: input.slug,
        product: input.product,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminProductsKey(input.locationSlug) });
    },
  });
}

export function useDeleteDaysiAdminProduct() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug: string; slug: string }) =>
      deleteDaysiAdminProduct({
        token: session.token!,
        locationSlug: input.locationSlug,
        slug: input.slug,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminProductsKey(input.locationSlug) });
    },
  });
}
