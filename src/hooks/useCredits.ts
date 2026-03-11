import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { fetchDaysiMyCredits } from "@/lib/daysi-auth-api";

interface CreditTransaction {
  id: string;
  amountCents: number;
  currency: string;
  type: "grant" | "redeem" | "restore";
  description: string | null;
  createdAt: string;
}

interface CreditsData {
  balanceAmountCents: number;
  currency: string;
  transactions: CreditTransaction[];
}

export function useCredits() {
  const { session } = useAuth();

  return useQuery<CreditsData>({
    queryKey: ["daysi-credits", session?.access_token],
    queryFn: async () => {
      if (!session?.access_token) {
        return {
          balanceAmountCents: 0,
          currency: "CAD",
          transactions: [],
        };
      }

      const credits = await fetchDaysiMyCredits(session.access_token);

      return {
        balanceAmountCents: credits.availableAmount.amountCents,
        currency: credits.availableAmount.currency,
        transactions: credits.entries.map((entry) => ({
          id: entry.id,
          amountCents:
            entry.type === "redeem" ? -entry.amount.amountCents : entry.amount.amountCents,
          currency: entry.amount.currency,
          type: entry.type,
          description: entry.note ?? null,
          createdAt: entry.createdAt,
        })),
      };
    },
    staleTime: 1000 * 30,
  });
}

export function useCreditBalance() {
  const { data, ...rest } = useCredits();

  return {
    balanceAmountCents: data?.balanceAmountCents ?? 0,
    currency: data?.currency ?? "CAD",
    ...rest,
  };
}
