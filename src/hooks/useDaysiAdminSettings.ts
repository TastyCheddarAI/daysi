import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import {
  createDaysiAdminCustomer,
  createDaysiAdminReferralProgram,
  createDaysiAdminRoleAssignment,
  deleteDaysiAdminRoleAssignment,
  fetchDaysiAdminBusinessProfile,
  listDaysiAdminReferralPrograms,
  listDaysiAdminRoleAssignments,
  updateDaysiAdminBusinessProfile,
  updateDaysiAdminCustomer,
  updateDaysiAdminReferralProgram,
  updateDaysiAdminRoleAssignment,
  type DaysiAdminCustomerInput,
  type DaysiAdminRoleAssignment,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG, type DaysiBusinessProfile } from "@/lib/daysi-public-api";
import { type DaysiReferralProgram } from "@/lib/daysi-auth-api";

const resolveAdminLocationSlug = (
  session: ReturnType<typeof useDaysiAdminSession>,
  locationSlug?: string,
): string => locationSlug ?? session.actor?.locationScopes[0] ?? DAYSI_DEFAULT_LOCATION_SLUG;

export function useDaysiAdminBusinessProfile(input?: { locationSlug?: string }) {
  const session = useDaysiAdminSession();
  const locationSlug = resolveAdminLocationSlug(session, input?.locationSlug);

  return useQuery({
    queryKey: ["daysi-admin-business-profile", locationSlug],
    queryFn: async () =>
      fetchDaysiAdminBusinessProfile({
        token: session.token!,
        locationSlug,
      }),
    enabled: session.ready,
    staleTime: 30_000,
  });
}

export function useUpdateDaysiAdminBusinessProfile() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      profile: DaysiBusinessProfile;
    }) =>
      updateDaysiAdminBusinessProfile({
        token: session.token!,
        locationSlug: resolveAdminLocationSlug(session, input.locationSlug),
        profile: input.profile,
      }),
    onSuccess: (_profile, input) => {
      const locationSlug = resolveAdminLocationSlug(session, input.locationSlug);
      queryClient.invalidateQueries({ queryKey: ["daysi-admin-business-profile", locationSlug] });
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
    },
  });
}

export function useDaysiAdminRoleAssignments(input?: { locationSlug?: string }) {
  const session = useDaysiAdminSession();
  const locationSlug = input?.locationSlug;

  return useQuery({
    queryKey: ["daysi-admin-role-assignments", locationSlug ?? "all"],
    queryFn: async () =>
      listDaysiAdminRoleAssignments({
        token: session.token!,
        locationSlug,
      }),
    enabled: session.ready,
    staleTime: 15_000,
  });
}

const invalidateRoleAssignments = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-role-assignments"] });
};

export function useCreateDaysiAdminRoleAssignment() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      email: string;
      role: DaysiAdminRoleAssignment["role"];
      locationScopes: string[];
    }) =>
      createDaysiAdminRoleAssignment({
        token: session.token!,
        email: input.email,
        role: input.role,
        locationScopes: input.locationScopes,
      }),
    onSuccess: () => {
      invalidateRoleAssignments(queryClient);
    },
  });
}

export function useUpdateDaysiAdminRoleAssignment() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      assignmentId: string;
      role?: DaysiAdminRoleAssignment["role"];
      locationScopes?: string[];
    }) =>
      updateDaysiAdminRoleAssignment({
        token: session.token!,
        assignmentId: input.assignmentId,
        role: input.role,
        locationScopes: input.locationScopes,
      }),
    onSuccess: () => {
      invalidateRoleAssignments(queryClient);
    },
  });
}

export function useDeleteDaysiAdminRoleAssignment() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { assignmentId: string }) =>
      deleteDaysiAdminRoleAssignment({
        token: session.token!,
        assignmentId: input.assignmentId,
      }),
    onSuccess: () => {
      invalidateRoleAssignments(queryClient);
    },
  });
}

export function useDaysiAdminReferralPrograms(input?: { locationSlug?: string }) {
  const session = useDaysiAdminSession();
  const locationSlug = resolveAdminLocationSlug(session, input?.locationSlug);

  return useQuery({
    queryKey: ["daysi-admin-referral-programs", locationSlug],
    queryFn: async () =>
      listDaysiAdminReferralPrograms({
        token: session.token!,
        locationSlug,
      }),
    enabled: session.ready,
    staleTime: 15_000,
  });
}

const invalidateReferralPrograms = (
  queryClient: ReturnType<typeof useQueryClient>,
  locationSlug: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["daysi-admin-referral-programs", locationSlug] });
  queryClient.invalidateQueries({ queryKey: ["daysi-referral-overview"] });
};

export function useCreateDaysiAdminReferralProgram() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug?: string;
      name: string;
      status: DaysiReferralProgram["status"];
      codePrefix?: string;
      referredReward?: DaysiReferralProgram["referredReward"];
      advocateReward?: DaysiReferralProgram["advocateReward"];
      secondLevelReward?: DaysiReferralProgram["secondLevelReward"];
    }) =>
      createDaysiAdminReferralProgram({
        token: session.token!,
        locationSlug: resolveAdminLocationSlug(session, input.locationSlug),
        name: input.name,
        status: input.status,
        codePrefix: input.codePrefix,
        referredReward: input.referredReward,
        advocateReward: input.advocateReward,
        secondLevelReward: input.secondLevelReward,
      }),
    onSuccess: (program) => {
      invalidateReferralPrograms(queryClient, program.locationSlug);
    },
  });
}

export function useUpdateDaysiAdminReferralProgram() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      programId: string;
      name?: string;
      status?: DaysiReferralProgram["status"];
      codePrefix?: string;
      referredReward?: DaysiReferralProgram["referredReward"] | null;
      advocateReward?: DaysiReferralProgram["advocateReward"] | null;
      secondLevelReward?: DaysiReferralProgram["secondLevelReward"] | null;
    }) =>
      updateDaysiAdminReferralProgram({
        token: session.token!,
        programId: input.programId,
        name: input.name,
        status: input.status,
        codePrefix: input.codePrefix,
        referredReward: input.referredReward,
        advocateReward: input.advocateReward,
        secondLevelReward: input.secondLevelReward,
      }),
    onSuccess: (program) => {
      invalidateReferralPrograms(queryClient, program.locationSlug);
    },
  });
}

// Customer creation hook
const adminCustomersKey = (locationSlug: string) => ["daysi-admin-customers", locationSlug] as const;

export function useCreateDaysiAdminCustomer() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      customer: DaysiAdminCustomerInput;
    }) =>
      createDaysiAdminCustomer({
        token: session.token!,
        locationSlug: input.locationSlug,
        customer: input.customer,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminCustomersKey(input.locationSlug) });
    },
  });
}

export function useUpdateDaysiAdminCustomer() {
  const session = useDaysiAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      locationSlug: string;
      customerEmail: string;
      customer: Partial<DaysiAdminCustomerInput>;
    }) =>
      updateDaysiAdminCustomer({
        token: session.token!,
        locationSlug: input.locationSlug,
        customerEmail: input.customerEmail,
        customer: input.customer,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminCustomersKey(input.locationSlug) });
    },
  });
}
