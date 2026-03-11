import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  CalendarClock,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Tag,
  User,
  UserRoundSearch,
  WalletCards,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { RescheduleDialog } from "@/components/admin/schedule/RescheduleDialog";
import {
  formatDaysiAdminSlotTime,
  getDaysiAdminBookingCustomerName,
  getDaysiAdminBookingDuration,
  getDaysiAdminBookingStatusInfo,
  getDaysiBookingOriginInfo,
  type DaysiAdminBookingRecord,
  useCancelDaysiAdminBooking,
  useDaysiAdminCustomerContext,
} from "@/hooks/useDaysiAdminBookings";

interface BookingDetailsPanelProps {
  booking: DaysiAdminBookingRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amountCents / 100);

export function BookingDetailsPanel({
  booking,
  open,
  onOpenChange,
  isAdmin,
}: BookingDetailsPanelProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const cancelBooking = useCancelDaysiAdminBooking();
  const customerContext = useDaysiAdminCustomerContext({
    locationSlug: booking?.locationSlug ?? "",
    customerEmail: booking?.customer.email,
  });

  if (!booking) {
    return null;
  }

  const customerName = getDaysiAdminBookingCustomerName(booking);
  const initials = customerName
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const statusInfo = getDaysiAdminBookingStatusInfo(booking.status);
  const originInfo = getDaysiBookingOriginInfo(booking);
  const durationMinutes = getDaysiAdminBookingDuration(booking);
  const isCancellable = booking.status === "confirmed";

  const handleCancelBooking = async () => {
    try {
      await cancelBooking.mutateAsync({
        bookingId: booking.id,
        locationSlug: booking.locationSlug,
        customerEmail: booking.customer.email,
        reason: "Cancelled by admin",
      });
      toast.success("Booking cancelled successfully");
      setShowCancelDialog(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Details
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            <section className="space-y-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg truncate">{customerName}</h3>
                    <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.serviceName} with {booking.providerName}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <a
                  href={`mailto:${booking.customer.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{booking.customer.email}</span>
                </a>
                {booking.customer.phone ? (
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{booking.customer.phone}</span>
                  </a>
                ) : null}
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Appointment
              </h4>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {format(new Date(booking.startAt), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {formatDaysiAdminSlotTime(booking.startAt)} ({durationMinutes} min)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{booking.locationSlug}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">{booking.providerName}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Machine</span>
                  <span className="font-medium">{booking.machineName}</span>
                </div>
                {booking.roomName ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Room</span>
                    <span className="font-medium">{booking.roomName}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Origin</span>
                  <span className="font-medium">{originInfo.label}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                    {formatMoney(booking.charge.finalAmountCents, booking.charge.currency)}
                  </span>
                </div>
              </div>
            </section>

            {booking.notes ? (
              <>
                <Separator />
                <section className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Booking Notes
                  </h4>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">{booking.notes}</div>
                </section>
              </>
            ) : null}

            <Separator />

            <section className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Context
              </h4>
              {customerContext.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading customer context...</div>
              ) : customerContext.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-2xl font-bold">{customerContext.data.summary.bookingCount}</p>
                      <p className="text-xs text-muted-foreground">Bookings</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-2xl font-bold">
                        {customerContext.data.summary.activeSubscriptionCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Active memberships</p>
                    </div>
                  </div>

                  {customerContext.data.tags.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {customerContext.data.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary" className="gap-1">
                            <Tag className="h-3 w-3" />
                            {tag.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {customerContext.data.notes.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Latest note
                      </p>
                      <div className="rounded-lg bg-muted/50 p-3 text-sm">
                        {customerContext.data.notes[0]?.body}
                      </div>
                    </div>
                  ) : null}

                  {customerContext.data.recentEvents.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Recent activity
                      </p>
                      <div className="space-y-2">
                        {customerContext.data.recentEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-2 text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {event.source === "skinAnalysis" ? (
                                <UserRoundSearch className="h-4 w-4 text-muted-foreground" />
                              ) : event.source === "commerce" ? (
                                <WalletCards className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="truncate">{event.eventType}</span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(event.occurredAt), "MMM d")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No customer context available yet.
                </div>
              )}
            </section>

            <Separator />

            <div className="space-y-3">
              {isCancellable && isAdmin ? (
                <>
                  <Button variant="outline" className="w-full" onClick={() => setShowRescheduleDialog(true)}>
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                </>
              ) : null}
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p>Booking code: {booking.code}</p>
              <p>Booking ID: {booking.id}</p>
              <p>Created: {format(new Date(booking.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment scheduled for{" "}
              {format(new Date(booking.startAt), "EEEE, MMMM d 'at' h:mm a")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelBooking.isPending}
            >
              {cancelBooking.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Booking"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RescheduleDialog
        booking={booking}
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
      />
    </>
  );
}
