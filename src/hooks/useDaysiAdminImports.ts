import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import {
  createDaysiAdminImportJob,
  deleteDaysiAdminImportJob,
  listDaysiAdminImportJobs,
  updateDaysiAdminImportJob,
  type DaysiAdminImportJob,
  type ImportJobType,
  type ImportJobStatus,
  type ImportJobError,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

export function useDaysiAdminImportJobs(input?: { locationSlug?: string }) {
  const session = useDaysiAdminSession();
  const locationSlug = input?.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: ["daysi-admin-import-jobs", locationSlug],
    queryFn: async () =>
      listDaysiAdminImportJobs({
        token: session.token!,
        locationSlug,
      }),
    enabled: session.ready,
    staleTime: 15_000,
  });
}

const invalidateImportJobs = (
  queryClient: ReturnType<typeof useQueryClient>,
  locationSlug: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-import-jobs", locationSlug] });
};

export function useCreateDaysiAdminImportJob() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      type: ImportJobType;
      fileName: string;
      rowCount: number;
      metadata?: Record<string, unknown>;
    }) =>
      createDaysiAdminImportJob({
        token: session.token!,
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        type: input.type,
        fileName: input.fileName,
        rowCount: input.rowCount,
        metadata: input.metadata,
      }),
    onSuccess: (_job, input) => {
      invalidateImportJobs(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
    },
  });
}

export function useUpdateDaysiAdminImportJob() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      jobId: string;
      locationSlug?: string;
      status?: ImportJobStatus;
      processedCount?: number;
      successCount?: number;
      errorCount?: number;
      errors?: ImportJobError[];
    }) =>
      updateDaysiAdminImportJob({
        token: session.token!,
        jobId: input.jobId,
        status: input.status,
        processedCount: input.processedCount,
        successCount: input.successCount,
        errorCount: input.errorCount,
        errors: input.errors,
      }),
    onSuccess: (_job, input) => {
      invalidateImportJobs(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
    },
  });
}

export function useDeleteDaysiAdminImportJob() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { jobId: string; locationSlug?: string }) =>
      deleteDaysiAdminImportJob({
        token: session.token!,
        jobId: input.jobId,
      }),
    onSuccess: (_data, input) => {
      invalidateImportJobs(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
    },
  });
}
