import { CSSProperties } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, User } from "lucide-react";
import {
  getDaysiAdminBookingCustomerName,
  getDaysiAdminBookingDuration,
  getDaysiAdminBookingStatusInfo,
  type DaysiAdminBookingRecord,
} from "@/hooks/useDaysiAdminBookings";

interface AppointmentBlockProps {
  booking: DaysiAdminBookingRecord;
  style?: CSSProperties;
  onClick?: () => void;
}

// Color scheme based on service category or booking status
const getBlockColors = (booking: DaysiAdminBookingRecord): { bg: string; border: string; text: string } => {
  const status = booking.status;

  switch (status) {
    case "confirmed":
      return {
        bg: "bg-primary/15 dark:bg-primary/20",
        border: "border-primary/50",
        text: "text-gray-800 dark:text-gray-100",
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-muted-foreground/30",
        text: "text-muted-foreground",
      };
  }
};

export function AppointmentBlock({
  booking,
  style,
  onClick,
}: AppointmentBlockProps) {
  const colors = getBlockColors(booking);
  const statusInfo = getDaysiAdminBookingStatusInfo(booking.status);
  const duration = getDaysiAdminBookingDuration(booking);
  const startTime = parseISO(booking.startAt);

  // Calculate if we have enough space for details
  const heightNum = typeof style?.height === "number" ? style.height : 64;
  const isCompact = heightNum < 48;
  const isTiny = heightNum < 32;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md border-l-4 px-2 py-1 text-left transition-all",
        "hover:shadow-md hover:scale-[1.02] cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        colors.bg,
        colors.border,
        colors.text
      )}
      style={style}
    >
      <div className={cn("flex flex-col h-full overflow-hidden", isTiny && "justify-center")}>
        {/* Time and Service Name */}
        <div className="flex items-center justify-between gap-1">
          <span className={cn("font-medium truncate", isCompact ? "text-xs" : "text-sm")}>
            {booking.serviceName}
          </span>
          {!isTiny && (
            <span className="text-xs opacity-70 shrink-0">
              {format(startTime, "h:mm a")}
            </span>
          )}
        </div>

        {/* Duration and Status */}
        {!isCompact && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs opacity-70 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration} min
            </span>
            {booking.status !== "confirmed" && (
              <span className={cn("text-xs font-medium", statusInfo.color)}>
                {statusInfo.label}
              </span>
            )}
          </div>
        )}

        {/* Customer info if we have space */}
        {heightNum >= 80 && (
          <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
            <User className="h-3 w-3" />
            <span className="truncate">{getDaysiAdminBookingCustomerName(booking)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
