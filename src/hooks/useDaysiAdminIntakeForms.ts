import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import {
  createDaysiAdminIntakeForm,
  deleteDaysiAdminIntakeForm,
  listDaysiAdminIntakeForms,
  updateDaysiAdminIntakeForm,
  type DaysiAdminIntakeForm,
  type FormField,
  type IntakeFormStatus,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

export function useDaysiAdminIntakeForms(input?: { locationSlug?: string }) {
  const session = useDaysiAdminSession();
  const locationSlug = input?.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: ["daysi-admin-intake-forms", locationSlug],
    queryFn: async () =>
      listDaysiAdminIntakeForms({
        token: session.token!,
        locationSlug,
      }),
    enabled: session.ready,
    staleTime: 15_000,
  });
}

const invalidateIntakeForms = (
  queryClient: ReturnType<typeof useQueryClient>,
  locationSlug: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-intake-forms", locationSlug] });
};

export function useCreateDaysiAdminIntakeForm() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      name: string;
      description?: string;
      fields?: FormField[];
      assignedServices?: string[];
      requiredForBooking?: boolean;
    }) =>
      createDaysiAdminIntakeForm({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        name: input.name,
        description: input.description,
        fields: input.fields,
        assignedServices: input.assignedServices,
        requiredForBooking: input.requiredForBooking,
      }),
    onSuccess: (_form, input) => {
      invalidateIntakeForms(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
    },
  });
}

export function useUpdateDaysiAdminIntakeForm() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      formId: string;
      locationSlug?: string;
      name?: string;
      description?: string;
      status?: IntakeFormStatus;
      fields?: FormField[];
      assignedServices?: string[];
      requiredForBooking?: boolean;
    }) =>
      updateDaysiAdminIntakeForm({
        token: session.token!,
        formId: input.formId,
        name: input.name,
        description: input.description,
        status: input.status,
        fields: input.fields,
        assignedServices: input.assignedServices,
        requiredForBooking: input.requiredForBooking,
      }),
    onSuccess: (_form, input) => {
      invalidateIntakeForms(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
    },
  });
}

export function useDeleteDaysiAdminIntakeForm() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { formId: string; locationSlug?: string }) =>
      deleteDaysiAdminIntakeForm({
        token: session.token!,
        formId: input.formId,
      }),
    onSuccess: (_data, input) => {
      invalidateIntakeForms(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
    },
  });
}
