import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfDay, isSameDay, addDays } from "date-fns";
import { DateNavigation } from "./DateNavigation";

export interface AvailabilitySlot {
  slotId: string;
  start_at: string;
  end_at?: string;
  service_slug?: string;
  service_variant_slug?: string;
  provider_name?: string;
  provider_slug?: string;
  machine_name?: string;
  room_name?: string;
}

interface AvailabilityPickerProps {
  slots: AvailabilitySlot[];
  serviceName: string;
  onSelect: (slot: AvailabilitySlot) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  disabled?: boolean;
  isLoadingMore?: boolean;
}

function groupSlotsByDate(slots: AvailabilitySlot[]): Map<string, AvailabilitySlot[]> {
  const grouped = new Map<string, AvailabilitySlot[]>();
  
  slots.forEach(slot => {
    const dateKey = format(parseISO(slot.start_at), "yyyy-MM-dd");
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(slot);
  });

  return grouped;
}

export function AvailabilityPicker({ 
  slots, 
  serviceName, 
  onSelect, 
  onDateRangeChange,
  disabled,
  isLoadingMore 
}: AvailabilityPickerProps) {
  // Get all unique dates with slots
  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots]);
  const availableDates = useMemo(() => 
    [...slotsByDate.keys()]
      .sort()
      .map(dateStr => parseISO(dateStr)),
    [slotsByDate]
  );

  // Default to first available date
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    availableDates.length > 0 ? availableDates[0] : null
  );
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [showAllSlots, setShowAllSlots] = useState(false);

  // Get slots for selected date
  const currentDaySlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return slotsByDate.get(dateKey) || [];
  }, [selectedDate, slotsByDate]);

  // Show limited slots unless expanded
  const INITIAL_SLOT_COUNT = 8;
  const visibleSlots = showAllSlots 
    ? currentDaySlots 
    : currentDaySlots.slice(0, INITIAL_SLOT_COUNT);
  const hasMoreSlots = currentDaySlots.length > INITIAL_SLOT_COUNT;

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowAllSlots(false);
  };

  const handleLoadMoreDates = (startDate: Date, endDate: Date) => {
    onDateRangeChange?.(startDate, endDate);
  };

  const handleSlotClick = (slot: AvailabilitySlot) => {
    if (disabled) return;
    setSelectedSlot(slot);
    onSelect(slot);
  };

  if (slots.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No availability found for this service. Please call us to schedule!
        </p>
      </div>
    );
  }

  const selectedDateLabel = selectedDate 
    ? isSameDay(selectedDate, new Date()) 
      ? "Today"
      : isSameDay(selectedDate, addDays(new Date(), 1))
        ? "Tomorrow"
        : format(selectedDate, "EEEE, MMM d")
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="bg-primary/5 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Available Times</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{serviceName}</p>
      </div>

      {/* Date navigation */}
      <div className="px-3 py-2 border-b bg-muted/20">
        <DateNavigation
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onLoadMoreDates={handleLoadMoreDates}
          isLoadingMore={isLoadingMore}
          maxDate={addDays(new Date(), 30)}
        />
      </div>

      {/* Time slots for selected date */}
      <div className="p-3 space-y-3 max-h-[250px] overflow-y-auto">
        {isLoadingMore ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading times...</span>
          </div>
        ) : currentDaySlots.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {selectedDateLabel}
            </p>
            <div className="flex flex-wrap gap-2 overflow-hidden">
              {visibleSlots.map((slot, idx) => {
                const time = format(parseISO(slot.start_at), "h:mm a");
                const isSelected = selectedSlot?.start_at === slot.start_at;
                
                return (
                  <motion.div
                    key={`${slot.start_at}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "text-xs h-8 px-3",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => handleSlotClick(slot)}
                      disabled={disabled}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {time}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Show more button */}
            {hasMoreSlots && !showAllSlots && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-primary"
                onClick={() => setShowAllSlots(true)}
              >
                Show {currentDaySlots.length - INITIAL_SLOT_COUNT} more times
              </Button>
            )}
          </div>
        ) : selectedDate ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No times available for {selectedDateLabel}. Try another date!
            </p>
          </div>
        ) : null}
      </div>

      {/* Selection prompt */}
      {!selectedSlot && !isLoadingMore && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            Tap a time to continue
          </p>
        </div>
      )}
    </motion.div>
  );
}
