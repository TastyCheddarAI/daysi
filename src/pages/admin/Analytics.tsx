import { useMemo, useState } from "react";
import { formatDistanceToNow, format, subDays } from "date-fns";
import { Eye, MousePointerClick, Percent, RefreshCw, Timer, Users } from "lucide-react";

import { AnalyticsKPICard } from "@/components/admin/analytics/AnalyticsKPICard";
import { BrowserBreakdownChart } from "@/components/admin/analytics/BrowserBreakdownChart";
import { CTAPerformanceCard } from "@/components/admin/analytics/CTAPerformanceCard";
import { DeviceBreakdown } from "@/components/admin/analytics/DeviceBreakdown";
import { RealtimeVisitors } from "@/components/admin/analytics/RealtimeVisitors";
import { TopPagesChart } from "@/components/admin/analytics/TopPagesChart";
import { TrafficOverTimeChart } from "@/components/admin/analytics/TrafficOverTimeChart";
import { TrafficSources } from "@/components/admin/analytics/TrafficSources";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDaysiWebAnalyticsReport } from "@/hooks/useDaysiAdminBookings";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
};

const getAnalyticsWindow = (period: AnalyticsPeriod) => {
  const now = new Date();
  const daysBack = period === "24h" ? 1 : period === "7d" ? 6 : period === "30d" ? 29 : 89;

  return {
    fromDate: format(subDays(now, daysBack), "yyyy-MM-dd"),
    toDate: format(now, "yyyy-MM-dd"),
  };
};

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const window = useMemo(() => getAnalyticsWindow(period), [period]);

  const analyticsQuery = useDaysiWebAnalyticsReport({
    locationSlug,
    fromDate: window.fromDate,
    toDate: window.toDate,
  });

  const analytics = analyticsQuery.data;

  if (analyticsQuery.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Website Analytics</h1>
          <p className="text-muted-foreground mt-1">First-party traffic and conversion reporting</p>
        </div>
        <EmptyState
          title="Failed to load website analytics"
          description="The Daysi website analytics report could not be loaded."
          action={{ label: "Retry", onClick: () => analyticsQuery.refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Website Analytics</h1>
          <p className="text-muted-foreground mt-1">
            First-party Daysi traffic, page performance, and booking conversion
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {analytics?.realtime && <RealtimeVisitors count={analytics.realtime.activeVisitors} />}
          {analytics?.realtime.lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  analyticsQuery.isFetching ? "bg-amber-500 animate-pulse" : "bg-green-500"
                }`}
              />
              Updated {formatDistanceToNow(new Date(analytics.realtime.lastUpdated))} ago
            </span>
          )}
          <Select value={period} onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => analyticsQuery.refetch()}
            variant="outline"
            disabled={analyticsQuery.isFetching}
            size="sm"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${analyticsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {analyticsQuery.isLoading ? (
        <StatsCardLoader count={5} />
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <AnalyticsKPICard
              title="Unique Visitors"
              value={analytics.summary.uniqueVisitors}
              icon={Users}
              sparklineData={analytics.dailyData.map((entry) => entry.visitors)}
            />
            <AnalyticsKPICard
              title="Page Views"
              value={analytics.summary.pageViews}
              icon={Eye}
              sparklineData={analytics.dailyData.map((entry) => entry.pageViews)}
            />
            <AnalyticsKPICard
              title="Booking Conversion"
              value={formatPercent(analytics.summary.bookingConversionRate)}
              icon={MousePointerClick}
            />
            <AnalyticsKPICard
              title="Bounce Rate"
              value={formatPercent(analytics.summary.bounceRate)}
              icon={Percent}
              invertTrend
            />
            <AnalyticsKPICard
              title="Avg Session"
              value={formatDuration(analytics.summary.avgSessionDuration)}
              icon={Timer}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKPICard
              title="CTA Clicks"
              value={analytics.summary.ctaClicks}
              icon={MousePointerClick}
            />
            <AnalyticsKPICard
              title="Total Bookings"
              value={analytics.summary.totalBookings}
              icon={Users}
            />
            <AnalyticsKPICard
              title="Newsletter Subs"
              value={analytics.summary.newsletterSubscriptions}
              icon={Users}
            />
            <AnalyticsKPICard
              title="Pages / Session"
              value={analytics.summary.pagesPerSession.toFixed(2)}
              icon={Eye}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TrafficOverTimeChart
              data={analytics.dailyData.map((entry) => ({
                date: entry.date,
                visitors: entry.visitors,
                pageViews: entry.pageViews,
                bookings: entry.bookings,
              }))}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TrafficSources sources={analytics.trafficSources} />
            <DeviceBreakdown devices={analytics.devices} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BrowserBreakdownChart browsers={analytics.browsers} />
            <CTAPerformanceCard ctaData={analytics.ctaPerformance} />
          </div>

          <TopPagesChart
            topPages={analytics.topPages.map((page) => ({
              path: page.path,
              views: page.views ?? 0,
            }))}
            entryPages={analytics.entryPages.map((page) => ({
              path: page.path,
              entries: page.entries ?? 0,
              bounceRate: page.bounceRate ?? 0,
            }))}
            exitPages={analytics.exitPages.map((page) => ({
              path: page.path,
              exits: page.exits ?? 0,
            }))}
          />
        </>
      ) : (
        <EmptyState
          title="No analytics data"
          description="Public traffic and CTA events will appear here once the site starts collecting Daysi events."
        />
      )}
    </div>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
