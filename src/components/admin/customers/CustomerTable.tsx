import type { DaysiCustomerDirectoryEntry } from "@/lib/daysi-admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

const formatMoney = (amountCents: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

interface CustomerTableProps {
  customers: DaysiCustomerDirectoryEntry[];
  isLoading: boolean;
  onSelectCustomer: (customer: DaysiCustomerDirectoryEntry) => void;
  selectedCustomerEmail: string | null;
}

export function CustomerTable({
  customers,
  isLoading,
  onSelectCustomer,
  selectedCustomerEmail,
}: CustomerTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <User className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>No Daysi customers matched this filter.</p>
        <p className="text-sm">Customers appear here as bookings, orders, memberships, or assessments are recorded.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Bookings</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="w-[72px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const isSelected = selectedCustomerEmail === customer.customerEmail;
            const isMember = customer.summary.activeSubscriptionCount > 0;
            const hasEducation = customer.summary.activeEntitlementCount > 0;
            const hasAssessment = customer.summary.skinAssessmentCount > 0;

            return (
              <TableRow
                key={customer.customerEmail}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  isSelected && "bg-muted",
                )}
                onClick={() => onSelectCustomer(customer)}
              >
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {customer.customerName || customer.customerEmail}
                    </div>
                    <div className="text-sm text-muted-foreground">{customer.customerEmail}</div>
                    {customer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag.id} variant="outline" className="text-[10px]">
                            {tag.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {isMember && <Badge className="bg-emerald-100 text-emerald-800">Member</Badge>}
                    {hasEducation && (
                      <Badge className="bg-blue-100 text-blue-800">Education</Badge>
                    )}
                    {hasAssessment && (
                      <Badge className="bg-amber-100 text-amber-800">Assessment</Badge>
                    )}
                    {!isMember && !hasEducation && !hasAssessment && (
                      <Badge variant="secondary">Standard</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {customer.summary.lastSeenAt
                      ? new Date(customer.summary.lastSeenAt).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No activity"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {customer.summary.activeCreditAmountCents > 0
                      ? `${formatMoney(customer.summary.activeCreditAmountCents)} credits`
                      : "No active credits"}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoney(customer.summary.totalPaidRevenueAmountCents)}
                </TableCell>
                <TableCell className="text-right">{customer.summary.bookingCount}</TableCell>
                <TableCell className="text-right">{customer.summary.paidOrderCount}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectCustomer(customer);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
