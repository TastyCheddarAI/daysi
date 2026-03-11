import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface PriceBreakdownProps {
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  creditsApplied?: number;
  total: number;
  referralCode?: string | null;
}

export function PriceBreakdown({
  subtotal,
  discountPercent = 0,
  discountAmount = 0,
  creditsApplied = 0,
  total,
  referralCode,
}: PriceBreakdownProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>
            Referral Discount ({discountPercent}%)
            {referralCode && (
              <span className="text-xs ml-1">({referralCode})</span>
            )}
          </span>
          <span>-{formatCurrency(discountAmount)}</span>
        </div>
      )}

      {creditsApplied > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Store Credits Applied</span>
          <span>-{formatCurrency(creditsApplied)}</span>
        </div>
      )}

      <Separator />

      <div className="flex justify-between font-semibold text-lg">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
