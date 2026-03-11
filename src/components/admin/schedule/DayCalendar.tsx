import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { AppointmentBlock } from "./AppointmentBlock";
import { TimeGutter } from "./TimeGutter";
import { StaffColumn } from "./StaffColumn";
import {
  getDaysiAdminBookingDuration,
  type DaysiAdminBookingRecord,
} from "@/hooks/useDaysiAdminBookings";
import { type DaysiAdminProviderSummary } from "@/lib/daysi-admin-api";

interface DayCalendarProps {
  date: Date;
  bookings: DaysiAdminBookingRecord[];
  providers: DaysiAdminProviderSummary[];
  onBookingClick: (booking: DaysiAdminBookingRecord) => void;
  startHour?: number;
  endHour?: number;
  selectedProviderSlug?: string | null;
}

// Time slot configuration
const SLOT_HEIGHT = 64; // pixels per hour
const SLOT_MINUTES = 60;

export function DayCalendar({
  date,
  bookings,
  providers,
  onBookingClick,
  startHour = 8,
  endHour = 20,
  selectedProviderSlug,
}: DayCalendarProps) {
  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(hour);
    }
    return slots;
  }, [startHour, endHour]);

  // Group bookings by team member
  const bookingsByProvider = useMemo(() => {
    const map = new Map<string, DaysiAdminBookingRecord[]>();
    
    providers.forEach((provider) => {
      map.set(provider.providerSlug, []);
    });

    // Also add an "Unassigned" category
    map.set("unassigned", []);

    // Group bookings
    bookings.forEach((booking) => {
      if (booking.providerSlug && map.has(booking.providerSlug)) {
        map.get(booking.providerSlug)!.push(booking);
      } else {
        map.get("unassigned")!.push(booking);
      }
    });

    return map;
  }, [bookings, providers]);

  // Filter to only show team members with bookings or who are active
  // When selectedStaffId is set, only show that single staff member
  const displayedProviders = useMemo(() => {
    // If a specific staff member is selected, only show them
    if (selectedProviderSlug) {
      const selectedProvider = providers.find(
        (provider) => provider.providerSlug === selectedProviderSlug,
      );
      return selectedProvider ? [selectedProvider] : [];
    }

    // Otherwise, show members with bookings (or first 3 if none have bookings)
    const withBookings = providers.filter((provider) => {
      const providerBookings = bookingsByProvider.get(provider.providerSlug) || [];
      return providerBookings.length > 0;
    });

    if (withBookings.length === 0) {
      return providers.slice(0, 3);
    }

    return withBookings;
  }, [providers, bookingsByProvider, selectedProviderSlug]);

  // Calculate position for a booking
  const getBookingPosition = (booking: DaysiAdminBookingRecord) => {
    const startTime = parseISO(booking.startAt);
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const dayStartMinutes = startHour * 60;
    
    const topOffset = ((startMinutes - dayStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT;
    const duration = getDaysiAdminBookingDuration(booking);
    const height = (duration / SLOT_MINUTES) * SLOT_HEIGHT;

    return {
      top: Math.max(0, topOffset),
      height: Math.max(SLOT_HEIGHT / 2, height), // Minimum height
    };
  };

  // Current time indicator
  const now = new Date();
  const isToday = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
  const currentTimePosition = useMemo(() => {
    if (!isToday) return null;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayStartMinutes = startHour * 60;
    const dayEndMinutes = endHour * 60;
    
    if (currentMinutes < dayStartMinutes || currentMinutes > dayEndMinutes) {
      return null;
    }
    
    return ((currentMinutes - dayStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT;
  }, [isToday, now, startHour, endHour]);

  const totalHeight = timeSlots.length * SLOT_HEIGHT;
  const unassignedBookings = bookingsByProvider.get("unassigned") || [];
  const isSingleColumn =
    selectedProviderSlug !== null && selectedProviderSlug !== undefined;

  return (
    <div className={isSingleColumn ? "w-full max-w-full" : "overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0"}>
      <div className={isSingleColumn ? "w-full max-w-full" : "min-w-[480px] sm:min-w-[600px]"}>
        {/* Staff Headers */}
        <div className="flex border-b">
          <div className="w-14 sm:w-20 shrink-0 p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground border-r">
            Time
          </div>
          {displayedProviders.map((provider) => (
            <StaffColumn key={provider.providerSlug} provider={provider} isHeader />
          ))}
          {unassignedBookings.length > 0 && (
            <div className="flex-1 min-w-[120px] sm:min-w-[200px] p-1 sm:p-2 text-center text-sm font-medium border-r bg-muted/30">
              Unassigned
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="flex relative" style={{ height: totalHeight }}>
          {/* Time Gutter */}
          <TimeGutter timeSlots={timeSlots} slotHeight={SLOT_HEIGHT} />

          {/* Staff Columns with Bookings */}
          {displayedProviders.map((provider) => {
            const providerBookings = bookingsByProvider.get(provider.providerSlug) || [];
            return (
              <div
                key={provider.providerSlug}
                className={isSingleColumn 
                  ? "flex-1 relative border-r" 
                  : "flex-1 min-w-[120px] sm:min-w-[200px] relative border-r"
                }
              >
                {/* Hour grid lines */}
                {timeSlots.map((hour, idx) => (
                  <div
                    key={hour}
                    className={cn(
                      "absolute left-0 right-0 border-b border-dashed border-muted",
                      idx === 0 && "border-t"
                    )}
                    style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                  />
                ))}

                {/* Bookings */}
                {providerBookings.map((booking) => {
                  const position = getBookingPosition(booking);
                  return (
                    <AppointmentBlock
                      key={booking.id}
                      booking={booking}
                      style={{
                        position: "absolute",
                        top: position.top,
                        height: position.height,
                        left: 4,
                        right: 4,
                      }}
                      onClick={() => onBookingClick(booking)}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Unassigned Column */}
          {unassignedBookings.length > 0 && (
            <div className="flex-1 min-w-[120px] sm:min-w-[200px] relative border-r bg-muted/10">
              {timeSlots.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-b border-dashed border-muted"
                  style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                />
              ))}

              {unassignedBookings.map((booking) => {
                const position = getBookingPosition(booking);
                return (
                  <AppointmentBlock
                    key={booking.id}
                    booking={booking}
                    style={{
                      position: "absolute",
                      top: position.top,
                      height: position.height,
                      left: 4,
                      right: 4,
                    }}
                    onClick={() => onBookingClick(booking)}
                  />
                );
              })}
            </div>
          )}

          {/* Current Time Indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: currentTimePosition }}
            >
              <div className="w-14 sm:w-20 flex justify-end pr-1">
                <div className="bg-destructive text-destructive-foreground text-[10px] sm:text-xs px-1 rounded">
                  {format(now, "h:mm")}
                </div>
              </div>
              <div className="flex-1 h-0.5 bg-destructive" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
