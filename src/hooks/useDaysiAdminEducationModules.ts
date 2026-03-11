import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import {
  createDaysiAdminEducationModule,
  deleteDaysiAdminEducationModule,
  generateDaysiAdminModuleContent,
  listDaysiAdminEducationModules,
  publishDaysiAdminEducationModule,
  updateDaysiAdminEducationModule,
  type CreateEducationModuleInput,
  type DaysiAdminEducationModule,
  type GenerateModuleContentInput,
  type UpdateEducationModuleInput,
} from "@/lib/daysi-education-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

const modulesQueryKey = (locationSlug: string) => [
  "daysi-admin-education-modules",
  locationSlug,
];

const invalidateModulesQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  locationSlug: string,
) => {
  queryClient.invalidateQueries({
    queryKey: modulesQueryKey(locationSlug),
  });
};

export function useDaysiAdminEducationModules(input: {
  locationSlug?: string;
  search?: string;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  const modulesQuery = useQuery({
    queryKey: modulesQueryKey(locationSlug),
    queryFn: async () => listDaysiAdminEducationModules(session.token!, locationSlug),
    enabled: session.ready,
    staleTime: 30_000,
  });

  const filteredModules = useMemo(() => {
    const modules = modulesQuery.data?.modules ?? [];
    if (!input.search?.trim()) return modules;

    const needle = input.search.toLowerCase().trim();
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(needle) ||
        m.shortDescription.toLowerCase().includes(needle) ||
        m.tags?.some((t) => t.toLowerCase().includes(needle)),
    );
  }, [modulesQuery.data?.modules, input.search]);

  return useMemo(
    () => ({
      locationSlug,
      modules: filteredModules,
      stats: modulesQuery.data?.stats,
      isLoading: modulesQuery.isLoading,
      isFetching: modulesQuery.isFetching,
      error: modulesQuery.error,
      refetch: modulesQuery.refetch,
    }),
    [filteredModules, locationSlug, modulesQuery],
  );
}

export function useCreateDaysiAdminEducationModule() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEducationModuleInput & { locationSlug?: string }) => {
      const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;
      return createDaysiAdminEducationModule({
        token: session.token!,
        locationSlug,
        ...input,
      });
    },
    onSuccess: (_data, input) => {
      invalidateModulesQueries(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
      toast.success("Education module created successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create module");
    },
  });
}

export function useUpdateDaysiAdminEducationModule() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateEducationModuleInput & { locationSlug?: string; slug: string },
    ) => {
      const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;
      return updateDaysiAdminEducationModule({
        token: session.token!,
        locationSlug,
        slug: input.slug,
        ...input,
      });
    },
    onSuccess: (_data, input) => {
      invalidateModulesQueries(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
      toast.success("Education module updated successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update module");
    },
  });
}

export function useDeleteDaysiAdminEducationModule() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug?: string; slug: string }) => {
      const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;
      return deleteDaysiAdminEducationModule({
        token: session.token!,
        locationSlug,
        slug: input.slug,
      });
    },
    onSuccess: (_data, input) => {
      invalidateModulesQueries(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
      toast.success("Education module deleted successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete module");
    },
  });
}

export function usePublishDaysiAdminEducationModule() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { locationSlug?: string; slug: string }) => {
      const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;
      return publishDaysiAdminEducationModule({
        token: session.token!,
        locationSlug,
        slug: input.slug,
      });
    },
    onSuccess: (_data, input) => {
      invalidateModulesQueries(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
      toast.success("Education module published successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to publish module");
    },
  });
}

export function useGenerateDaysiAdminModuleContent() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateModuleContentInput & { locationSlug?: string }) => {
      const locationSlug = input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;
      return generateDaysiAdminModuleContent({
        token: session.token!,
        locationSlug,
        ...input,
      });
    },
    onSuccess: (_data, input) => {
      invalidateModulesQueries(queryClient, input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
      toast.success("AI content generation started. The module will appear shortly.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate content");
    },
  });
}
