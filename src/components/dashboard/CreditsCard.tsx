import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCredits } from "@/hooks/useCredits";

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);

export function CreditsCard() {
  const { data, isLoading } = useCredits();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const balanceAmountCents = data?.balanceAmountCents ?? 0;
  const currency = data?.currency ?? "CAD";
  const transactions = data?.transactions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Daysi Credits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <div className="text-3xl font-bold text-primary">
            {formatMoney(balanceAmountCents, currency)}
          </div>
          <div className="text-sm text-muted-foreground">Available Balance</div>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {tx.amountCents > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium capitalize">
                        {tx.type.replace("_", " ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className={tx.amountCents > 0 ? "text-green-600" : "text-red-600"}>
                    {tx.amountCents > 0 ? "+" : ""}
                    {formatMoney(tx.amountCents, tx.currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No Daysi credit activity yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
