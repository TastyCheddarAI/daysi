import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDays, format, isToday, startOfDay, subDays } from "date-fns";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Gauge,
  GraduationCap,
  Layers3,
  Sparkles,
  Users,
  TrendingUp,
  AlertCircle,
  Plus,
  CalendarDays,
  CreditCard,
  Package,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import { Separator } from "@/components/ui/separator";
import {
  getDaysiAdminBookingCustomerName,
  getDaysiAdminBookingStatusInfo,
  useDaysiAdminBookings,
  useDaysiMembershipPerformanceReport,
  useDaysiOperationsPerformanceReport,
  useDaysiRevenueSummaryReport,
} from "@/hooks/useDaysiAdminBookings";
import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const session = useDaysiAdminSession();
  const { isAdmin } = useAdminAuth();
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;

  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");

  const bookingWindow = useMemo(() => {
    const now = new Date();
    return {
      fromDate: format(subDays(now, 14), "yyyy-MM-dd"),
      toDate: format(addDays(now, 14), "yyyy-MM-dd"),
      reportFromDate: format(subDays(now, 14), "yyyy-MM-dd"),
      reportToDate: format(now, "yyyy-MM-dd"),
    };
  }, []);

  const bookingsQuery = useDaysiAdminBookings({
    locationSlug,
    fromDate: bookingWindow.fromDate,
    toDate: bookingWindow.toDate,
  });

  const todayBookingsQuery = useDaysiAdminBookings({
    locationSlug,
    fromDate: todayStr,
    toDate: todayStr,
  });

  const revenueQuery = useDaysiRevenueSummaryReport({
    locationSlug,
    fromDate: bookingWindow.reportFromDate,
    toDate: bookingWindow.reportToDate,
  });
  const membershipQuery = useDaysiMembershipPerformanceReport(locationSlug);
  const operationsQuery = useDaysiOperationsPerformanceReport({
    locationSlug,
    fromDate: bookingWindow.reportFromDate,
    toDate: bookingWindow.reportToDate,
  });

  const loading =
    session.isLoading ||
    bookingsQuery.isLoading ||
    todayBookingsQuery.isLoading ||
    revenueQuery.isLoading ||
    membershipQuery.isLoading ||
    operationsQuery.isLoading;

  const error =
    session.error ||
    bookingsQuery.error ||
    revenueQuery.error ||
    membershipQuery.error ||
    operationsQuery.error;

  const stats = useMemo(() => {
    const bookings = bookingsQuery.data ?? [];
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
    const todayBookings = todayBookingsQuery.data ?? [];
    const todayConfirmed = todayBookings.filter((b) => b.status === "confirmed");

    return {
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      todayBookings: todayConfirmed.length,
      todayRevenue: todayConfirmed.reduce((sum, b) => sum + b.charge.finalAmountCents, 0),
      netRevenueAmountCents: revenueQuery.data?.totals.netAmount.amountCents ?? 0,
      revenueCurrency: revenueQuery.data?.currency ?? "CAD",
      activeMemberships: membershipQuery.data?.totals.activeSubscriptionCount ?? 0,
      totalCustomers: membershipQuery.data?.totals.totalSubscriptions ?? 0,
      educationMemberships:
        membershipQuery.data?.totals.educationOnlyActiveSubscriptionCount ?? 0,
      searchToBookingRate: operationsQuery.data?.conversion.searchToBookingRate ?? 0,
      paidBookings: operationsQuery.data?.conversion.paidBookingCount ?? 0,
      averageMachineUtilization:
        operationsQuery.data?.machines.length
          ? operationsQuery.data.machines.reduce(
              (total, m) => total + m.utilizationPercent,
              0,
            ) / operationsQuery.data.machines.length
          : 0,
    };
  }, [bookingsQuery.data, todayBookingsQuery.data, revenueQuery.data, membershipQuery.data, operationsQuery.data]);

  const todaySchedule = useMemo(() => {
    const bookings = todayBookingsQuery.data ?? [];
    return bookings
      .filter((b) => b.status === "confirmed")
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5);
  }, [todayBookingsQuery.data]);

  const recentBookings = useMemo(
    () =>
      (bookingsQuery.data ?? [])
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5),
    [bookingsQuery.data],
  );

  const alerts = useMemo(() => {
    const items = [];
    if (stats.averageMachineUtilization > 90) {
      items.push({ type: "warning", message: "Machine utilization is over 90%" });
    }
    if (stats.todayBookings === 0) {
      items.push({ type: "info", message: "No appointments scheduled for today" });
    }
    if (membershipQuery.data?.totals.pendingSubscriptionCount ?? 0 > 0) {
      items.push({
        type: "info",
        message: `${membershipQuery.data?.totals.pendingSubscriptionCount} pending memberships`,
      });
    }
    return items;
  }, [stats, membershipQuery.data]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Daysi operating overview</p>
        </div>
        <EmptyState
          title="Failed to load dashboard"
          description="The Daysi admin dashboard could not be loaded."
          action={{
            label: "Retry",
            onClick: () => {
              bookingsQuery.refetch();
              todayBookingsQuery.refetch();
              revenueQuery.refetch();
              membershipQuery.refetch();
              operationsQuery.refetch();
            },
          }}
        />
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings,
      icon: CalendarDays,
      description: format(new Date(), "MMMM d, yyyy"),
      trend: stats.todayBookings > 0 ? "Active" : "No bookings",
    },
    {
      title: "Today's Revenue",
      value: formatMoney(stats.todayRevenue, stats.revenueCurrency),
      icon: DollarSign,
      description: "From confirmed appointments",
      trend: stats.todayRevenue > 0 ? "+" + formatMoney(stats.todayRevenue, stats.revenueCurrency) : "$0",
    },
    {
      title: "Active Memberships",
      value: stats.activeMemberships,
      icon: Sparkles,
      description: "Current subscribers",
      trend: `${stats.totalCustomers} total customers`,
    },
    {
      title: "14-Day Revenue",
      value: formatMoney(stats.netRevenueAmountCents, stats.revenueCurrency),
      icon: TrendingUp,
      description: "Net revenue",
      trend: `${stats.paidBookings} paid bookings`,
    },
    {
      title: "Conversion Rate",
      value: `${stats.searchToBookingRate.toFixed(1)}%`,
      icon: ArrowUpRight,
      description: "Search to booking",
      trend: "Last 14 days",
    },
    {
      title: "Machine Utilization",
      value: `${stats.averageMachineUtilization.toFixed(0)}%`,
      icon: Gauge,
      description: "Average across machines",
      trend: stats.averageMachineUtilization > 80 ? "High" : "Normal",
    },
    {
      title: "Total Bookings",
      value: stats.confirmedBookings,
      icon: Calendar,
      description: "Confirmed (14 days)",
      trend: `${bookingsQuery.data?.length ?? 0} total`,
    },
    {
      title: "Education Plans",
      value: stats.educationMemberships,
      icon: GraduationCap,
      description: "Active education-only",
      trend: "Members",
    },
  ];

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session.actor?.displayName || "Admin"} • {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Admin Access
            </Badge>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      {loading ? (
        <StatsCardLoader count={8} />
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground text-xs">{stat.description}</span>
                    <span className="text-xs text-muted-foreground">{stat.trend}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
              <CardDescription>
                {todaySchedule.length} appointment{todaySchedule.length !== 1 ? "s" : ""} today
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/schedule">
                View Full Schedule
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : todaySchedule.length === 0 ? (
              <EmptyState
                title="No appointments today"
                description="Your schedule is clear for today."
                action={{ label: "View Schedule", onClick: () => navigate("/admin/schedule") }}
              />
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((booking) => {
                  const statusInfo = getDaysiAdminBookingStatusInfo(booking.status);
                  return (
                    <Link
                      key={booking.id}
                      to={`/admin/bookings?search=${booking.code}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-background rounded-lg border">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(booking.startAt), "h:mm")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(booking.startAt), "a")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{getDaysiAdminBookingCustomerName(booking)}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {booking.serviceName} • {booking.providerName}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap ${statusInfo.bgColor} ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/bookings">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Bookings
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/services">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Manage Services
                </Link>
              </Button>
              {isAdmin && (
                <>
                  <Button asChild variant="outline" className="justify-start">
                    <Link to="/admin/customers">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Customer
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start">
                    <Link to="/admin/revenue">
                      <CreditCard className="mr-2 h-4 w-4" />
                      View Revenue
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start">
                    <Link to="/admin/learning">
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Education
                    </Link>
                  </Button>
                </>
              )}
              <Separator className="my-2" />
              <Button asChild className="justify-start">
                <Link to="/admin/schedule">
                  <Plus className="mr-2 h-4 w-4" />
                  New Booking
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                      alert.type === "warning"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {alert.message}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest customer appointments</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="flex-shrink-0">
            <Link to="/admin/bookings">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((key) => (
                <div key={key} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <EmptyState title="No recent bookings" description="Bookings will appear here" />
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => {
                const statusInfo = getDaysiAdminBookingStatusInfo(booking.status);
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getDaysiAdminBookingCustomerName(booking)}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {booking.serviceName} • {format(new Date(booking.startAt), "MMM d 'at' h:mm a")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap ${statusInfo.bgColor} ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
