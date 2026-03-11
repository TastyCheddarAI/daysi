import { useState, useMemo } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { Calendar, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  formatDaysiAdminSlotTime,
  groupAvailabilitySlotsByDate,
  type DaysiAdminBookingRecord,
  useDaysiBookingRebookingOptions,
  useRescheduleDaysiAdminBooking,
} from "@/hooks/useDaysiAdminBookings";

interface RescheduleDialogProps {
  booking: DaysiAdminBookingRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescheduleDialog({
  booking,
  open,
  onOpenChange,
}: RescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const updateBooking = useRescheduleDaysiAdminBooking();

  // Search for availability in the next 14 days from selected date
  const searchStartDate = selectedDate ? format(startOfDay(selectedDate), "yyyy-MM-dd") : undefined;
  const searchEndDate = selectedDate
    ? format(addDays(startOfDay(selectedDate), 7), "yyyy-MM-dd")
    : undefined;

  const { data: availabilities, isLoading: availabilityLoading } =
    useDaysiBookingRebookingOptions({
      bookingId: booking?.id,
      fromDate: searchStartDate,
      toDate: searchEndDate,
      pricingMode: booking?.charge.appliedPricingMode,
    });

  // Group availabilities by date
  const slotsByDate = useMemo(() => {
    if (!availabilities) return new Map();
    return groupAvailabilitySlotsByDate(availabilities);
  }, [availabilities]);

  // Get slots for selected date
  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return slotsByDate.get(dateKey) || [];
  }, [selectedDate, slotsByDate]);

  const handleReschedule = async () => {
    if (!booking || !selectedSlotId) return;

    try {
      await updateBooking.mutateAsync({
        bookingId: booking.id,
        locationSlug: booking.locationSlug,
        customerEmail: booking.customer.email,
        slotId: selectedSlotId,
        pricingMode: booking.charge.appliedPricingMode,
      });
      toast.success("Appointment rescheduled successfully");
      onOpenChange(false);
      setSelectedDate(undefined);
      setSelectedSlotId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reschedule");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            {booking?.serviceName || "Select a new date and time for this appointment"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <div>
            <h4 className="font-medium mb-2 text-sm">Select Date</h4>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedSlotId(null);
              }}
              disabled={(date) => date < startOfDay(new Date())}
              className="rounded-md border"
            />
          </div>

          {/* Time Slots */}
          <div>
            <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Available Times
              {selectedDate && (
                <span className="text-muted-foreground font-normal">
                  - {format(selectedDate, "MMM d")}
                </span>
              )}
            </h4>

            {!selectedDate ? (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                Select a date to see available times
              </div>
            ) : availabilityLoading ? (
              <div className="flex items-center justify-center py-8 border rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedDateSlots.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                No available slots on this date
              </div>
            ) : (
              <ScrollArea className="h-[280px] border rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2">
                  {selectedDateSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.slotId;
                    return (
                      <Button
                        key={slot.slotId}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedSlotId(slot.slotId)}
                      >
                        {formatDaysiAdminSlotTime(slot.startAt)}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!selectedSlotId || updateBooking.isPending}
          >
            {updateBooking.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Confirm Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
