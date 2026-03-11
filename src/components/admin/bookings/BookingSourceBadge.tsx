import { Badge } from "@/components/ui/badge";
import { Sparkles, UserRoundSearch, WalletCards } from "lucide-react";
import {
  getDaysiBookingOriginInfo,
  type DaysiAdminBookingRecord,
} from "@/hooks/useDaysiAdminBookings";

interface BookingSourceBadgeProps {
  booking: DaysiAdminBookingRecord;
}

export function BookingSourceBadge({ booking }: BookingSourceBadgeProps) {
  const info = getDaysiBookingOriginInfo(booking);

  const Icon = booking.sourceTreatmentPlanId
    ? Sparkles
    : booking.sourceAssessmentId
      ? UserRoundSearch
      : booking.charge.appliedPricingMode === "membership"
        ? WalletCards
        : Sparkles;

  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}
