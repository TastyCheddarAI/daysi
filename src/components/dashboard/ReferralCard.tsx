import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReferralOverview } from "@/hooks/useReferralCode";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import {
  buildReferralProgramSummary,
  formatReferralCreditAmount,
  generateShareUrl,
  generateShareText,
} from "@/lib/referral";
import { Copy, Share2, Users, Gift, Check } from "lucide-react";
import { toast } from "sonner";

export function ReferralCard() {
  const referralOverviewQuery = useReferralOverview();
  const { data: settings } = useBusinessSettings();
  const [copied, setCopied] = useState(false);
  const referralCode = referralOverviewQuery.data?.referralCode ?? null;
  const referralCurrency =
    referralOverviewQuery.data?.program?.referredReward?.amount.currency ??
    referralOverviewQuery.data?.program?.advocateReward?.amount.currency ??
    referralOverviewQuery.data?.summary.totalRewardAmount.currency ??
    "CAD";
  const referredRewardAmountCents =
    referralOverviewQuery.data?.program?.referredReward?.amount.amountCents;
  const advocateRewardAmountCents =
    referralOverviewQuery.data?.program?.advocateReward?.amount.amountCents;
  const secondLevelRewardAmountCents =
    referralOverviewQuery.data?.program?.secondLevelReward?.amount.amountCents;

  if (referralOverviewQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referralCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Make your first purchase to unlock your personal referral code and
            start earning credits!
          </p>
        </CardContent>
      </Card>
    );
  }

  const shareUrl = generateShareUrl(referralCode.code);
  const shareText = generateShareText(referralCode.code, {
    businessName: settings?.business_name ?? undefined,
    referredRewardAmountCents,
    currency: referralCurrency,
  });
  const summary = buildReferralProgramSummary({
    referredRewardAmountCents,
    advocateRewardAmountCents,
    secondLevelRewardAmountCents,
    currency: referralCurrency,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied! Share it with your friends");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Referral rewards at ${settings?.business_name || "Prairie Glow"}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Your Referral Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={referralCode.code}
            readOnly
            className="font-mono text-lg text-center"
          />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {summary}
        </p>

        {(referredRewardAmountCents || advocateRewardAmountCents) ? (
          <div className="flex flex-wrap gap-2">
            {referredRewardAmountCents ? (
              <Badge variant="outline">
                Friend credit:{" "}
                {formatReferralCreditAmount(referredRewardAmountCents, referralCurrency)}
              </Badge>
            ) : null}
            {advocateRewardAmountCents ? (
              <Badge variant="outline">
                Your reward:{" "}
                {formatReferralCreditAmount(advocateRewardAmountCents, referralCurrency)}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">
              {referralOverviewQuery.data?.summary.qualifiedInviteCount || 0}
            </div>
            <div className="text-xs text-muted-foreground">Referrals</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Gift className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">
              {formatReferralCreditAmount(
                referralOverviewQuery.data?.summary.totalRewardAmount.amountCents ?? 0,
                referralCurrency,
              )}
            </div>
            <div className="text-xs text-muted-foreground">Earned</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
