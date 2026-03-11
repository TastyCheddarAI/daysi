import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDaysiMyReferralOverview,
  type DaysiReferralOverview,
} from "@/lib/daysi-auth-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

export function useReferralOverview() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["daysi-referral-overview", session?.access_token, DAYSI_DEFAULT_LOCATION_SLUG],
    queryFn: async (): Promise<DaysiReferralOverview> =>
      fetchDaysiMyReferralOverview(session!.access_token, DAYSI_DEFAULT_LOCATION_SLUG),
    enabled: !!session?.access_token,
    staleTime: 30_000,
  });
}

export function useReferralCode() {
  const overviewQuery = useReferralOverview();

  return {
    ...overviewQuery,
    data: overviewQuery.data?.referralCode ?? null,
  };
}

export function useReferralStats() {
  const overviewQuery = useReferralOverview();

  return {
    ...overviewQuery,
    data: overviewQuery.data
      ? {
          totalReferrals: overviewQuery.data.summary.qualifiedInviteCount,
          totalEarnings: overviewQuery.data.summary.totalRewardAmount.amountCents / 100,
        }
      : { totalReferrals: 0, totalEarnings: 0 },
  };
}
