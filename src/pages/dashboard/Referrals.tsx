import { useState } from "react";
import {
  Gift,
  Users,
  Copy,
  Check,
  Share2,
  DollarSign,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import { useDaysiMyReferral, useApplyReferralCode } from "@/hooks/useDaysiReferrals";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { toast } from "sonner";

const formatMoney = (amountCents: number, currency: string = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

export default function ReferralDashboard() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const { data: overview, isLoading, refetch } = useDaysiMyReferral(locationSlug);
  const applyCode = useApplyReferralCode(locationSlug);
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (overview?.referralCode?.code) {
      await navigator.clipboard.writeText(overview.referralCode.code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (overview?.referralCode?.code) {
      const shareData = {
        title: "Join Daysi",
        text: `Use my referral code ${overview.referralCode.code} to get started with Daysi!`,
        url: window.location.origin,
      };
      
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch {
          // User cancelled
        }
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success("Share message copied!");
      }
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    
    try {
      await applyCode.mutateAsync(codeInput.trim());
      toast.success("Referral code applied successfully!");
      setCodeInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply code");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="text-muted-foreground mt-1">Share and earn rewards</p>
        </div>
        <StatsCardLoader count={3} />
      </div>
    );
  }

  // No active program
  if (!overview?.program || overview.program.status !== "active") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="text-muted-foreground mt-1">Share and earn rewards</p>
        </div>
        <EmptyState
          title="Referral program coming soon"
          description="Our referral program is currently being set up. Check back soon!"
          icon={Gift}
        />
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/?ref=${overview.referralCode?.code || ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referrals</h1>
        <p className="text-muted-foreground mt-1">Share Daysi with friends and earn rewards</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Friends Invited
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.summary.invitedCount}</div>
            <span className="text-muted-foreground text-xs">
              {overview.summary.qualifiedInviteCount} joined
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rewards
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(
                overview.summary.totalRewardAmount.amountCents,
                overview.summary.totalRewardAmount.currency
              )}
            </div>
            <span className="text-muted-foreground text-xs">Earned credits</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Code
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {overview.referralCode?.code || "---"}
            </div>
            <span className="text-muted-foreground text-xs">Share to earn</span>
          </CardContent>
        </Card>
      </div>

      {/* Share Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Share Your Code
          </CardTitle>
          <CardDescription>
            Invite friends and earn rewards when they join and make their first purchase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rewards Info */}
          <div className="grid gap-3 sm:grid-cols-2">
            {overview.program.referredReward && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">They Get</p>
                  <p className="text-muted-foreground text-sm">
                    {formatMoney(
                      overview.program.referredReward.amount.amountCents,
                      overview.program.referredReward.amount.currency
                    )} credit
                  </p>
                </div>
              </div>
            )}
            {overview.program.advocateReward && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">You Get</p>
                  <p className="text-muted-foreground text-sm">
                    {formatMoney(
                      overview.program.advocateReward.amount.amountCents,
                      overview.program.advocateReward.amount.currency
                    )} credit per friend
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Share Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Input
                value={overview.referralCode?.code || ""}
                readOnly
                className="font-mono bg-background"
              />
              <Button variant="outline" onClick={handleCopyCode} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleShare} className="shrink-0">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Referral URL */}
          <div className="p-3 bg-background rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Or share this link:</p>
            <p className="text-sm font-mono truncate">{referralUrl}</p>
          </div>
        </CardContent>
      </Card>

      {/* Apply Code Section - Only show if user hasn't applied one */}
      {!overview.appliedRelationship && (
        <Card>
          <CardHeader>
            <CardTitle>Have a Referral Code?</CardTitle>
            <CardDescription>
              Enter a friend's code to get a welcome credit on your first purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApplyCode} className="flex gap-2">
              <Input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter referral code"
                className="font-mono uppercase"
                maxLength={20}
              />
              <Button 
                type="submit" 
                disabled={!codeInput.trim() || applyCode.isPending}
              >
                {applyCode.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Apply <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Applied Code Status */}
      {overview.appliedRelationship && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Referral Code Applied!</p>
                <p className="text-sm text-muted-foreground">
                  You used code <Badge variant="secondary" className="font-mono">{overview.appliedRelationship.referralCode}</Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite History */}
      <Card>
        <CardHeader>
          <CardTitle>Invite History</CardTitle>
          <CardDescription>Track your referrals and rewards</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.invitedRelationships.length === 0 ? (
            <EmptyState
              title="No invites yet"
              description="Start sharing your code to invite friends and earn rewards"
              icon={Users}
            />
          ) : (
            <div className="space-y-3">
              {overview.invitedRelationships.map((relationship) => (
                <div
                  key={relationship.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {relationship.refereeEmail[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{relationship.refereeEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(relationship.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={relationship.status === "qualified" ? "default" : "secondary"}>
                    {relationship.status === "qualified" ? "Joined" : "Invited"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward History */}
      {overview.rewardEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reward History</CardTitle>
            <CardDescription>Credits earned from referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.rewardEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {event.recipient === "referee" 
                          ? "Welcome Credit" 
                          : "Referral Reward"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-green-600">
                    +{formatMoney(event.reward.amount.amountCents, event.reward.amount.currency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
