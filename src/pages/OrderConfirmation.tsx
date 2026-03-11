import { useLocation, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReferralOverview } from "@/hooks/useReferralCode";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import {
  buildReferralProgramSummary,
  formatReferralCreditAmount,
  generateShareUrl,
  generateShareText,
} from "@/lib/referral";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle,
  Copy,
  Share2,
  Calendar,
  Gift,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OrderConfirmation() {
  const location = useLocation();
  const { data: referralOverview } = useReferralOverview();
  const { data: settings } = useBusinessSettings();
  const [copied, setCopied] = useState(false);

  const order = location.state?.order;
  const isTestMode = location.state?.isTestMode;

  if (!order) {
    return <Navigate to="/pricing" replace />;
  }

  const referralCode = referralOverview?.referralCode ?? null;
  const referralCurrency =
    referralOverview?.program?.referredReward?.amount.currency ??
    referralOverview?.program?.advocateReward?.amount.currency ??
    referralOverview?.summary.totalRewardAmount.currency ??
    "CAD";
  const referredRewardAmountCents =
    referralOverview?.program?.referredReward?.amount.amountCents;
  const advocateRewardAmountCents =
    referralOverview?.program?.advocateReward?.amount.amountCents;
  const secondLevelRewardAmountCents =
    referralOverview?.program?.secondLevelReward?.amount.amountCents;
  const shareUrl = referralCode ? generateShareUrl(referralCode.code) : "";
  const shareText = referralCode
    ? generateShareText(referralCode.code, {
        businessName: settings?.business_name ?? undefined,
        referredRewardAmountCents,
        currency: referralCurrency,
      })
    : "";
  const referralSummary = buildReferralProgramSummary({
    referredRewardAmountCents,
    advocateRewardAmountCents,
    secondLevelRewardAmountCents,
    currency: referralCurrency,
  });

  const handleCopy = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Referral rewards at ${settings?.business_name || "Prairie Glow"}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Layout>
      <SEO title="Order Confirmed" description="Your order has been confirmed" keywords="order confirmation, purchase" />
      <div className="container py-12 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. You're one step closer to glowing skin!
          </p>
        </div>

        {isTestMode && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This was a test transaction. No real payment was processed.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">{order.productName}</span>
              {order.sessionsRemaining && (
                <Badge>{order.sessionsRemaining} Sessions</Badge>
              )}
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Referral Discount ({order.discountPercent}%)</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {order.creditsApplied > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Store Credits</span>
                  <span>-{formatCurrency(order.creditsApplied)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total Paid</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {referralCode && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Share & Earn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {referralSummary}
              </p>

              {(referredRewardAmountCents || advocateRewardAmountCents) ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {referredRewardAmountCents ? (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="font-medium">Friend Reward</div>
                      <div className="text-muted-foreground">
                        {formatReferralCreditAmount(
                          referredRewardAmountCents,
                          referralCurrency,
                        )}{" "}
                        account credit
                      </div>
                    </div>
                  ) : null}
                  {advocateRewardAmountCents ? (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="font-medium">Your Reward</div>
                      <div className="text-muted-foreground">
                        {formatReferralCreditAmount(
                          advocateRewardAmountCents,
                          referralCurrency,
                        )}{" "}
                        account credit
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex gap-2">
                <Input
                  value={referralCode.code}
                  readOnly
                  className="font-mono text-center"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          {order.sessionsRemaining && (
            <Button asChild className="flex-1">
              <Link to="/booking">
                <Calendar className="h-4 w-4 mr-2" />
                Book Your Session
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="flex-1">
            <Link to="/dashboard">View Dashboard</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
