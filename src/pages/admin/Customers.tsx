import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";

import type { DaysiCustomerDirectoryEntry } from "@/lib/daysi-admin-api";
import { CustomerDetailPanel } from "@/components/admin/customers/CustomerDetailPanel";
import { CustomerTable } from "@/components/admin/customers/CustomerTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-states";
import { Input } from "@/components/ui/input";
import { StatsCardLoader } from "@/components/ui/loading-states";
import { useDaysiAdminCustomers } from "@/hooks/useDaysiAdminCustomers";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

const PAGE_SIZE = 25;

const formatMoney = (amountCents: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

export default function AdminCustomers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<DaysiCustomerDirectoryEntry | null>(
    null,
  );

  const customersQuery = useDaysiAdminCustomers({
    locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
    search: searchTerm,
    page,
    pageSize: PAGE_SIZE,
  });

  const data = customersQuery.data;
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));
  const hasPrevious = page > 0;
  const hasNext = page + 1 < totalPages;

  const headlineStats = useMemo(
    () => [
      {
        title: "Total Customers",
        value: data?.stats.totalCustomers.toLocaleString() ?? "0",
        description: "Daysi customer directory",
        icon: Users,
      },
      {
        title: "Active Members",
        value: data?.stats.activeMembershipCustomerCount.toLocaleString() ?? "0",
        description: "Customers with active subscriptions",
        icon: Sparkles,
      },
      {
        title: "Paid Revenue",
        value: formatMoney(data?.stats.totalPaidRevenueAmountCents ?? 0),
        description: "Total paid revenue in directory",
        icon: CreditCard,
      },
      {
        title: "Paid Orders",
        value: data?.stats.totalPaidOrderCount.toLocaleString() ?? "0",
        description: "Completed commerce records",
        icon: ShoppingBag,
      },
    ],
    [data],
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  if (customersQuery.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Daysi CRM and customer context</p>
        </div>
        <EmptyState
          title="Failed to load customer CRM"
          description="The Daysi customer directory could not be loaded."
          action={{ label: "Retry", onClick: () => customersQuery.refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Daysi-native CRM built from bookings, orders, memberships, notes, and assessments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => customersQuery.refetch()}
          disabled={customersQuery.isFetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${customersQuery.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {customersQuery.isLoading ? (
        <StatsCardLoader count={4} />
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {headlineStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium truncate">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, tag, or segment..."
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
        {(data?.totalCount ?? 0) > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, data?.totalCount ?? 0)} of{" "}
            {(data?.totalCount ?? 0).toLocaleString()}
          </p>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <CustomerTable
            customers={data?.customers ?? []}
            isLoading={customersQuery.isLoading}
            onSelectCustomer={setSelectedCustomer}
            selectedCustomerEmail={selectedCustomer?.customerEmail ?? null}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current - 1)}
                disabled={!hasPrevious || customersQuery.isFetching}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasNext || customersQuery.isFetching}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDetailPanel
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
