import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { useDaysiSession } from "@/hooks/useDaysiSession";
import {
  applyReferralCode,
  fetchMyReferralOverview,
  type ApplyReferralCodeInput,
  type MyReferralOverview,
} from "@/lib/daysi-referral-api";

const referralKey = (locationSlug: string) => ["daysi-referral", locationSlug] as const;

export function useDaysiMyReferral(locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG) {
  const session = useDaysiSession();

  return useQuery({
    queryKey: referralKey(locationSlug),
    queryFn: async (): Promise<MyReferralOverview> => {
      if (!session.token) throw new Error("Not authenticated");
      const response = await fetchMyReferralOverview({ token: session.token, locationSlug });
      if (!response.ok) throw new Error(response.error?.message || "Failed to load referral data");
      return response.data.overview;
    },
    enabled: session.ready && !!session.token,
    staleTime: 30_000,
  });
}

export function useApplyReferralCode(locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG) {
  const session = useDaysiSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!session.token) throw new Error("Not authenticated");
      const input: ApplyReferralCodeInput = { locationSlug, code };
      const response = await applyReferralCode({ token: session.token, input });
      if (!response.ok) throw new Error(response.error?.message || "Failed to apply referral code");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKey(locationSlug) });
    },
  });
}
