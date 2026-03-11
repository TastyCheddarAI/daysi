import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Phone, Mail, Eye, XCircle } from "lucide-react";
import type { DaysiAdminBookingRecord } from "@/hooks/useDaysiAdminBookings";

interface QuickActionsProps {
  booking: DaysiAdminBookingRecord;
  onView: () => void;
  onCancel?: () => void;
  isCancellable: boolean;
  isAdmin: boolean;
}

export function QuickActions({
  booking,
  onView,
  onCancel,
  isCancellable,
  isAdmin,
}: QuickActionsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        {booking.customer.phone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                asChild
              >
                <a href={`tel:${booking.customer.phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Call customer</TooltipContent>
          </Tooltip>
        )}
        
        {booking.customer.email && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                asChild
              >
                <a href={`mailto:${booking.customer.email}`}>
                  <Mail className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Email customer</TooltipContent>
          </Tooltip>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onView}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View details</TooltipContent>
        </Tooltip>
        
        {isCancellable && isAdmin && onCancel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onCancel}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel booking</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
