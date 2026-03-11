import { useState } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  User,
  Settings,
  DollarSign,
  Users,
  Calendar,
  Shield,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { useDaysiAdminAuditLogs, useExportDaysiAdminAuditLogs } from "@/hooks/useDaysiAdminAudit";
import type { AuditActorType, DaysiAdminAuditLogEntry } from "@/lib/daysi-admin-api";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const actionIcons: Record<string, React.ElementType> = {
  "booking.created": Calendar,
  "booking.updated": Calendar,
  "booking.cancelled": Calendar,
  "booking.deleted": Calendar,
  "customer.updated": Users,
  "customer.created": Users,
  "service.created": Settings,
  "service.updated": Settings,
  "service.deleted": Settings,
  "membership.cycle_completed": DollarSign,
  "import.created": ClipboardList,
  "import.updated": ClipboardList,
  "intake_form.created": ClipboardList,
  "intake_form.updated": ClipboardList,
  "intake_form.deleted": ClipboardList,
  "referral.program.created": DollarSign,
  "referral.program.updated": DollarSign,
  default: ClipboardList,
};

const actionColors: Record<string, string> = {
  "booking.created": "bg-blue-100 text-blue-700",
  "booking.updated": "bg-blue-100 text-blue-700",
  "booking.cancelled": "bg-red-100 text-red-700",
  "booking.deleted": "bg-red-100 text-red-700",
  "customer.updated": "bg-green-100 text-green-700",
  "customer.created": "bg-green-100 text-green-700",
  "service.created": "bg-purple-100 text-purple-700",
  "service.updated": "bg-purple-100 text-purple-700",
  "service.deleted": "bg-red-100 text-red-700",
  "import.created": "bg-orange-100 text-orange-700",
  "intake_form.created": "bg-cyan-100 text-cyan-700",
  default: "bg-gray-100 text-gray-700",
};

const PAGE_SIZE = 25;

export default function AdminAudit() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterActor, setFilterActor] = useState<AuditActorType | "all">("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch, isFetching } = useDaysiAdminAuditLogs({
    locationSlug,
    entityType: filterType === "all" ? undefined : filterType,
    actorType: filterActor === "all" ? undefined : filterActor,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrevious = page > 0;
  const hasNext = page + 1 < totalPages;

  // Filter by search term client-side
  const filteredEntries = entries.filter((log) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      log.summary.toLowerCase().includes(query) ||
      log.actor.email.toLowerCase().includes(query) ||
      log.actor.name.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query)
    );
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Track all changes across the platform</p>
        </div>
        <StatsCardLoader count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Track all changes across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
          <ExportButton locationSlug={locationSlug} filterType={filterType} filterActor={filterActor} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, user, or entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="booking">Bookings</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="service">Services</SelectItem>
                  <SelectItem value="membership">Memberships</SelectItem>
                  <SelectItem value="import">Imports</SelectItem>
                  <SelectItem value="intake_form">Intake Forms</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterActor} onValueChange={(v) => setFilterActor(v as AuditActorType | "all")}>
                <SelectTrigger className="w-[150px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Actor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>{total} entries found</CardDescription>
          </div>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <EmptyState
              title="No audit entries"
              description="Try adjusting your filters"
              icon={<ClipboardList className="h-8 w-8" />}
            />
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((log) => {
                const Icon = actionIcons[log.action] || actionIcons.default;
                const colorClass = actionColors[log.action] || actionColors.default;
                const timestamp = formatTimestamp(log.timestamp);
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{log.summary}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.entityType}
                        </Badge>
                        <Badge 
                          variant={log.actor.type === "system" ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {log.actor.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.actor.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timestamp.date} at {timestamp.time}
                        </span>
                        {log.ipAddress && (
                          <span className="font-mono text-xs">{log.ipAddress}</span>
                        )}
                      </div>
                      {Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrevious || isFetching}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext || isFetching}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportButton({ 
  locationSlug, 
  filterType, 
  filterActor 
}: { 
  locationSlug: string; 
  filterType: string; 
  filterActor: AuditActorType | "all";
}) {
  const exportLogs = useExportDaysiAdminAuditLogs();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "json" | "csv") => {
    setIsExporting(true);
    try {
      const blob = await exportLogs.mutateAsync({
        locationSlug,
        entityType: filterType === "all" ? undefined : filterType,
        actorType: filterActor === "all" ? undefined : filterActor,
        format,
      });
      
      // Download the file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
