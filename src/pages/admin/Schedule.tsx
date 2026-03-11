import { useEffect, useMemo, useState } from "react";
import { addDays, format, isToday, startOfDay, subDays } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { BookingDetailsPanel } from "@/components/admin/bookings/BookingDetailsPanel";
import { DayCalendar } from "@/components/admin/schedule/DayCalendar";
import { StaffSelector } from "@/components/admin/schedule/StaffSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  type DaysiAdminBookingRecord,
  useDaysiAdminBookings,
  useDaysiAdminProviders,
} from "@/hooks/useDaysiAdminBookings";
import { useIsMobile } from "@/hooks/use-mobile";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<DaysiAdminBookingRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProviderSlug, setSelectedProviderSlug] = useState<string | null>(null);

  const { isAdmin } = useAdminAuth();
  const isMobile = useIsMobile();
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const dayKey = format(selectedDate, "yyyy-MM-dd");

  const { data: bookings = [], isLoading: bookingsLoading } = useDaysiAdminBookings({
    locationSlug,
    fromDate: dayKey,
    toDate: dayKey,
  });
  const { data: providers = [], isLoading: providersLoading } = useDaysiAdminProviders(locationSlug);

  useEffect(() => {
    if (isMobile && !selectedProviderSlug && providers.length > 0) {
      setSelectedProviderSlug(providers[0]?.providerSlug ?? null);
    }
  }, [isMobile, providers, selectedProviderSlug]);

  const dayBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "confirmed"),
    [bookings],
  );

  const pendingCount = 0;
  const confirmedCount = dayBookings.length;
  const isLoading = bookingsLoading || providersLoading;

  const handleBookingClick = (booking: DaysiAdminBookingRecord) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Visual daily calendar for Daysi bookings</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {confirmedCount} confirmed
            </Badge>
            {pendingCount > 0 ? (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                {pendingCount} pending
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                <span className="sm:hidden">{format(selectedDate, "EEE, MMM d")}</span>
                {isToday(selectedDate) ? (
                  <Badge variant="secondary" className="text-xs">
                    Today
                  </Badge>
                ) : null}
              </CardTitle>

              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{dayBookings.length} appointments</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant={isToday(selectedDate) ? "default" : "outline"}
                  size="sm"
                  className="h-8 sm:h-9"
                  onClick={() => setSelectedDate(startOfDay(new Date()))}
                >
                  Today
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <StaffSelector
                  providers={providers}
                  selectedProviderSlug={selectedProviderSlug}
                  onSelect={setSelectedProviderSlug}
                  showAllOption={!isMobile}
                />
                <div className="flex sm:hidden items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  <span>{dayBookings.length}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-0 sm:px-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex gap-4">
                  <Skeleton className="h-16 w-20" />
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <DayCalendar
              date={selectedDate}
              bookings={dayBookings}
              providers={providers}
              onBookingClick={handleBookingClick}
              selectedProviderSlug={selectedProviderSlug}
            />
          )}
        </CardContent>
      </Card>

      <BookingDetailsPanel
        booking={selectedBooking}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isAdmin={isAdmin}
      />
    </div>
  );
}
