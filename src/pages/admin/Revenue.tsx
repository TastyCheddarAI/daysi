import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  CreditCard,
  DollarSign,
  Gauge,
  RefreshCw,
  Receipt,
  Users,
} from "lucide-react";

import { KPICard } from "@/components/admin/revenue/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDaysiLocationFinanceDashboard,
  useDaysiMembershipPerformanceReport,
  useDaysiOperationsPerformanceReport,
  useDaysiRevenueSummaryReport,
} from "@/hooks/useDaysiAdminBookings";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

type RevenuePeriod = "7d" | "30d" | "90d" | "all";

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

const STREAM_LABELS: Record<string, string> = {
  services: "Services",
  memberships: "Memberships",
  packages: "Packages",
  retail: "Retail",
  education: "Education",
};

const STREAM_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const getRevenueWindow = (period: RevenuePeriod) => {
  if (period === "all") {
    return {
      fromDate: undefined,
      toDate: undefined,
    };
  }

  const now = new Date();
  const daysBack = period === "7d" ? 6 : period === "30d" ? 29 : 89;

  return {
    fromDate: format(subDays(now, daysBack), "yyyy-MM-dd"),
    toDate: format(now, "yyyy-MM-dd"),
  };
};

export default function Revenue() {
  const [period, setPeriod] = useState<RevenuePeriod>("30d");
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const window = useMemo(() => getRevenueWindow(period), [period]);

  const revenueQuery = useDaysiRevenueSummaryReport({
    locationSlug,
    fromDate: window.fromDate,
    toDate: window.toDate,
  });
  const financeQuery = useDaysiLocationFinanceDashboard(locationSlug);
  const membershipQuery = useDaysiMembershipPerformanceReport(locationSlug);
  const operationsQuery = useDaysiOperationsPerformanceReport({
    locationSlug,
    fromDate: window.fromDate,
    toDate: window.toDate,
  });

  const loading =
    revenueQuery.isLoading ||
    financeQuery.isLoading ||
    membershipQuery.isLoading ||
    operationsQuery.isLoading;

  const error =
    revenueQuery.error ||
    financeQuery.error ||
    membershipQuery.error ||
    operationsQuery.error;

  const isRefreshing =
    revenueQuery.isFetching ||
    financeQuery.isFetching ||
    membershipQuery.isFetching ||
    operationsQuery.isFetching;

  const refreshAll = () =>
    Promise.all([
      revenueQuery.refetch(),
      financeQuery.refetch(),
      membershipQuery.refetch(),
      operationsQuery.refetch(),
    ]);

  const currency =
    revenueQuery.data?.currency ?? financeQuery.data?.currency ?? membershipQuery.data?.currency ?? "CAD";

  const averageMachineUtilization = useMemo(() => {
    const machines = operationsQuery.data?.machines ?? [];
    if (machines.length === 0) return 0;
    return (
      machines.reduce((total, machine) => total + machine.utilizationPercent, 0) / machines.length
    );
  }, [operationsQuery.data?.machines]);

  const averageRoomUtilization = useMemo(() => {
    const rooms = operationsQuery.data?.rooms ?? [];
    if (rooms.length === 0) return 0;
    return rooms.reduce((total, room) => total + room.utilizationPercent, 0) / rooms.length;
  }, [operationsQuery.data?.rooms]);

  const streamChartData = useMemo(
    () =>
      (revenueQuery.data?.streams ?? []).map((stream, index) => ({
        name: STREAM_LABELS[stream.revenueStream] ?? stream.revenueStream,
        value: stream.netAmount.amountCents,
        orders: stream.orderCount,
        fill: STREAM_COLORS[index % STREAM_COLORS.length],
      })),
    [revenueQuery.data?.streams],
  );

  const topServices = useMemo(
    () =>
      [...(operationsQuery.data?.services ?? [])]
        .sort((left, right) => {
          const revenueDelta =
            right.paidServiceRevenueAmount.amountCents - left.paidServiceRevenueAmount.amountCents;
          if (revenueDelta !== 0) return revenueDelta;
          return right.paidBookingCount - left.paidBookingCount;
        })
        .slice(0, 5),
    [operationsQuery.data?.services],
  );

  const topPlans = useMemo(
    () =>
      [...(membershipQuery.data?.plans ?? [])]
        .sort((left, right) => {
          const activeDelta = right.activeSubscriptionCount - left.activeSubscriptionCount;
          if (activeDelta !== 0) return activeDelta;
          return (
            right.netMembershipRevenueAmount.amountCents -
            left.netMembershipRevenueAmount.amountCents
          );
        })
        .slice(0, 5),
    [membershipQuery.data?.plans],
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Revenue</h1>
          <p className="text-muted-foreground mt-1">Daysi revenue, payout, and utilization</p>
        </div>
        <EmptyState
          title="Failed to load revenue reporting"
          description="The Daysi revenue dashboard could not be loaded."
          action={{ label: "Retry", onClick: refreshAll }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Daysi-native revenue, payout, membership, and capacity reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as RevenuePeriod)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refreshAll} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <StatsCardLoader count={6} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <KPICard
            title="Net Revenue"
            value={revenueQuery.data?.totals.netAmount.amountCents ?? 0}
            formatter={(value) => formatMoney(value, currency)}
            secondaryValue={`${revenueQuery.data?.totals.orderCount ?? 0} paid orders`}
            icon={<DollarSign className="h-4 w-4" />}
            sparklineData={streamChartData.map((stream) => ({ value: stream.value }))}
            variant="primary"
          />
          <KPICard
            title="Gross Revenue"
            value={revenueQuery.data?.totals.grossAmount.amountCents ?? 0}
            formatter={(value) => formatMoney(value, currency)}
            secondaryValue={`${formatMoney(
              revenueQuery.data?.totals.discountAmount.amountCents ?? 0,
              currency,
            )} discounted`}
            icon={<Receipt className="h-4 w-4" />}
          />
          <KPICard
            title="Refunded"
            value={revenueQuery.data?.totals.refundedAmount.amountCents ?? 0}
            formatter={(value) => formatMoney(value, currency)}
            secondaryValue={PERIOD_LABELS[period]}
            icon={<ArrowDownRight className="h-4 w-4" />}
            variant="warning"
          />
          <KPICard
            title="Active Recurring"
            value={membershipQuery.data?.totals.activeRecurringAmount.amountCents ?? 0}
            formatter={(value) => formatMoney(value, currency)}
            secondaryValue={`${
              membershipQuery.data?.totals.activeSubscriptionCount ?? 0
            } active memberships`}
            icon={<Users className="h-4 w-4" />}
            variant="success"
          />
          <KPICard
            title="Paid Out"
            value={financeQuery.data?.paidPayoutAmountCents ?? 0}
            formatter={(value) => formatMoney(value, currency)}
            secondaryValue={`${financeQuery.data?.payoutRunCount ?? 0} payout runs`}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <KPICard
            title="Paid Bookings"
            value={operationsQuery.data?.conversion.paidBookingCount ?? 0}
            secondaryValue={`${formatPercent(
              operationsQuery.data?.conversion.searchToPaidBookingRate ?? 0,
            )} search-to-paid`}
            icon={<Gauge className="h-4 w-4" />}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Revenue Streams</CardTitle>
            <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[280px]">
              {streamChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={streamChartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatMoney(value, currency)}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {streamChartData.map((entry, index) => (
                        <Cell key={entry.name} fill={STREAM_COLORS[index % STREAM_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No revenue recorded in this window.
                </div>
              )}
            </div>

            <div className="grid gap-3">
              {(revenueQuery.data?.streams ?? []).map((stream) => (
                <div
                  key={stream.revenueStream}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {STREAM_LABELS[stream.revenueStream] ?? stream.revenueStream}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stream.orderCount} orders
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatMoney(stream.netAmount.amountCents, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(stream.refundedAmount.amountCents, currency)} refunded
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Location Finance</CardTitle>
            <CardDescription>All-time payout and settlement position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Total Net Revenue</p>
                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(financeQuery.data?.totals.netAmount.amountCents ?? 0, currency)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Paid Payouts</p>
                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(financeQuery.data?.paidPayoutAmountCents ?? 0, currency)}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <span className="text-sm text-muted-foreground">Draft payouts</span>
                <span className="font-medium">
                  {formatMoney(financeQuery.data?.draftPayoutAmountCents ?? 0, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <span className="text-sm text-muted-foreground">Approved payouts</span>
                <span className="font-medium">
                  {formatMoney(financeQuery.data?.approvedPayoutAmountCents ?? 0, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <span className="text-sm text-muted-foreground">Latest payout status</span>
                <span className="font-medium capitalize">
                  {financeQuery.data?.latestPayoutRunStatus ?? "none"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-1">
          <CardHeader>
            <CardTitle>Membership Performance</CardTitle>
            <CardDescription>Active plans and allowance exposure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Active memberships</p>
                <p className="mt-2 text-2xl font-bold">
                  {membershipQuery.data?.totals.activeSubscriptionCount ?? 0}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Remaining service allowances</p>
                <p className="mt-2 text-2xl font-bold">
                  {membershipQuery.data?.totals.serviceAllowanceRemainingQuantity ?? 0}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {topPlans.length > 0 ? (
                topPlans.map((plan) => (
                  <div
                    key={plan.planSlug}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{plan.planName}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.activeSubscriptionCount} active
                        {plan.educationOnly ? " · education" : " · service"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatMoney(plan.netMembershipRevenueAmount.amountCents, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {plan.serviceAllowanceRemainingQuantity} allowances open
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No membership plans activated yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden xl:col-span-1">
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Highest paid service lines in the selected window</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topServices.length > 0 ? (
              topServices.map((service) => (
                <div key={service.serviceSlug} className="rounded-lg border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{service.serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.paidBookingCount} paid bookings
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatMoney(service.paidServiceRevenueAmount.amountCents, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(service.searchToPaidBookingRate)} paid conversion
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No service revenue captured in this window.</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden xl:col-span-1">
          <CardHeader>
            <CardTitle>Capacity Utilization</CardTitle>
            <CardDescription>Machine and room usage across the selected window</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Average machine utilization</p>
                <p className="mt-2 text-2xl font-bold">{formatPercent(averageMachineUtilization)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average room utilization</p>
                <p className="mt-2 text-2xl font-bold">{formatPercent(averageRoomUtilization)}</p>
              </div>
            </div>

            <div className="h-[220px]">
              {operationsQuery.data?.machines.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={operationsQuery.data.machines.slice(0, 5).map((machine, index) => ({
                        name: machine.machineName,
                        value: machine.bookedMinutes,
                        fill: STREAM_COLORS[index % STREAM_COLORS.length],
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {operationsQuery.data.machines.slice(0, 5).map((machine, index) => (
                        <Cell
                          key={machine.machineSlug}
                          fill={STREAM_COLORS[index % STREAM_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} min booked`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No machine activity recorded.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
