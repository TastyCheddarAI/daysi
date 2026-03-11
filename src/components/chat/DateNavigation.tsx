import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays, isSameDay, startOfDay } from "date-fns";

interface DateNavigationProps {
  availableDates: Date[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onLoadMoreDates: (startDate: Date, endDate: Date) => void;
  isLoadingMore?: boolean;
  maxDate?: Date;
}

export function DateNavigation({
  availableDates,
  selectedDate,
  onDateSelect,
  onLoadMoreDates,
  isLoadingMore,
  maxDate,
}: DateNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Get unique dates with availability
  const uniqueDates = [...new Set(availableDates.map(d => startOfDay(d).getTime()))]
    .map(t => new Date(t))
    .sort((a, b) => a.getTime() - b.getTime());

  // Show up to 7 days in the pills
  const visibleDates = uniqueDates.slice(0, 7);

  // Handle scroll for arrow visibility
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => el.removeEventListener("scroll", handleScroll);
    }
  }, [visibleDates]);

  const scrollBy = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -100 : 100;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Check if date is in current range
    const isInRange = uniqueDates.some(d => isSameDay(d, date));
    
    if (isInRange) {
      onDateSelect(date);
      setCalendarOpen(false);
    } else {
      // Need to fetch new range
      const startDate = startOfDay(date);
      const endDate = addDays(startDate, 7);
      onLoadMoreDates(startDate, endDate);
      setCalendarOpen(false);
    }
  };

  const getDateLabel = (date: Date): string => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    
    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, tomorrow)) return "Tomorrow";
    return format(date, "EEE");
  };

  const getDateSublabel = (date: Date): string => {
    return format(date, "MMM d");
  };

  // Dates that have availability for calendar modifier
  const datesWithSlots = new Set(uniqueDates.map(d => format(d, "yyyy-MM-dd")));

  return (
    <div className="relative flex items-center gap-1">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-6 shrink-0"
          onClick={() => scrollBy("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable date pills */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth flex-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {visibleDates.map((date, idx) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          
          return (
            <motion.button
              key={date.getTime()}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onDateSelect(date)}
              className={cn(
                "flex flex-col items-center px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted text-foreground"
              )}
            >
              <span className="font-medium">{getDateLabel(date)}</span>
              <span className={cn(
                "text-[10px]",
                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {getDateSublabel(date)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && visibleDates.length > 3 && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-6 shrink-0"
          onClick={() => scrollBy("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Calendar popover */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleCalendarSelect}
            disabled={(date) => {
              const today = startOfDay(new Date());
              const max = maxDate || addDays(today, 30);
              return date < today || date > max;
            }}
            modifiers={{
              hasSlots: (date) => datesWithSlots.has(format(date, "yyyy-MM-dd")),
            }}
            modifiersClassNames={{
              hasSlots: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
            }}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
