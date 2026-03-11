import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDaysiAdminCustomerNote,
  createDaysiAdminCustomerTag,
  deleteDaysiAdminCustomerTag,
  listDaysiAdminCustomers,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";

export function useDaysiAdminCustomers(input: {
  locationSlug?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: [
      "daysi-admin-customers",
      locationSlug,
      input.search ?? "",
      input.page ?? 0,
      input.pageSize ?? 50,
    ],
    queryFn: async () =>
      listDaysiAdminCustomers({
        token: session.token!,
        locationSlug,
        search: input.search,
        page: input.page,
        pageSize: input.pageSize,
      }),
    enabled: session.ready,
    staleTime: 30_000,
  });
}

export function useCreateDaysiAdminCustomerNote() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      customerEmail: string;
      customerName?: string;
      body: string;
    }) =>
      createDaysiAdminCustomerNote({
        token: session.token!,
        locationSlug: input.locationSlug,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        body: input.body,
      }),
    onSuccess: (_note, input) => {
      queryClient.invalidateQueries({ queryKey: ["daysi-admin-customers"] });
      queryClient.invalidateQueries({
        queryKey: ["daysi-admin-customer-context", input.locationSlug, input.customerEmail],
      });
    },
  });
}

export function useCreateDaysiAdminCustomerTag() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      customerEmail: string;
      label: string;
    }) =>
      createDaysiAdminCustomerTag({
        token: session.token!,
        locationSlug: input.locationSlug,
        customerEmail: input.customerEmail,
        label: input.label,
      }),
    onSuccess: (_tag, input) => {
      queryClient.invalidateQueries({ queryKey: ["daysi-admin-customers"] });
      queryClient.invalidateQueries({
        queryKey: ["daysi-admin-customer-context", input.locationSlug, input.customerEmail],
      });
    },
  });
}

export function useDeleteDaysiAdminCustomerTag() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      customerEmail: string;
      tagId: string;
    }) =>
      deleteDaysiAdminCustomerTag({
        token: session.token!,
        tagId: input.tagId,
      }),
    onSuccess: (_value, input) => {
      queryClient.invalidateQueries({ queryKey: ["daysi-admin-customers"] });
      queryClient.invalidateQueries({
        queryKey: ["daysi-admin-customer-context", input.locationSlug, input.customerEmail],
      });
    },
  });
}
