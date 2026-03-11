import { useMemo, useState } from "react";
import { format, startOfDay, addMinutes } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  User,
  Sparkles,
  UserCircle,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import { BookingDetailsPanel } from "@/components/admin/bookings/BookingDetailsPanel";
import { BookingSourceBadge } from "@/components/admin/bookings/BookingSourceBadge";
import { QuickActions } from "@/components/admin/bookings/QuickActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  getDaysiAdminBookingCustomerName,
  getDaysiAdminBookingDuration,
  getDaysiAdminBookingStatusInfo,
  type DaysiAdminBookingRecord,
  useCancelDaysiAdminBooking,
  useDaysiAdminBookings,
  useCreateDaysiAdminBooking,
  useUpdateDaysiAdminBooking,
  useDeleteDaysiAdminBooking,
  useDaysiAdminServices,
  useDaysiAdminProviders,
} from "@/hooks/useDaysiAdminBookings";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

type StatusFilter = "all" | "confirmed" | "cancelled";

const formatDateOnly = (value: Date) => format(value, "yyyy-MM-dd");

interface BookingFormData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  serviceSlug: string;
  providerSlug: string;
  date: string;
  time: string;
  notes: string;
}

const defaultFormData: BookingFormData = {
  customerEmail: "",
  customerName: "",
  customerPhone: "",
  serviceSlug: "",
  providerSlug: "",
  date: formatDateOnly(new Date()),
  time: "09:00",
  notes: "",
};

export default function AdminBookings() {
  const { isAdmin } = useAdminAuth();
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;

  const [startDate] = useState(() => formatDateOnly(startOfDay(new Date())));
  const [endDate] = useState(() => {
    const end = startOfDay(new Date());
    end.setDate(end.getDate() + 29);
    return formatDateOnly(end);
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBooking, setSelectedBooking] = useState<DaysiAdminBookingRecord | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<DaysiAdminBookingRecord | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<DaysiAdminBookingRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>(defaultFormData);

  const { data: bookings = [], isLoading, refetch, isRefetching } = useDaysiAdminBookings({
    locationSlug,
    fromDate: startDate,
    toDate: endDate,
  });
  const { data: services = [] } = useDaysiAdminServices(locationSlug);
  const { data: providers = [] } = useDaysiAdminProviders(locationSlug);
  
  const cancelBooking = useCancelDaysiAdminBooking();
  const createBooking = useCreateDaysiAdminBooking();
  const updateBooking = useUpdateDaysiAdminBooking();
  const deleteBooking = useDeleteDaysiAdminBooking();

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((booking) => {
        if (booking.id.toLowerCase().includes(term)) return true;
        if (booking.code.toLowerCase().includes(term)) return true;
        if (booking.notes?.toLowerCase().includes(term)) return true;
        if (getDaysiAdminBookingCustomerName(booking).toLowerCase().includes(term)) return true;
        if (booking.customer.email.toLowerCase().includes(term)) return true;
        if (booking.serviceName.toLowerCase().includes(term)) return true;
        if (booking.providerName.toLowerCase().includes(term)) return true;
        return false;
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    return filtered.sort((left, right) => left.startAt.localeCompare(right.startAt));
  }, [bookings, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: bookings.length,
      confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
      today: bookings.filter(
        (booking) => booking.status === "confirmed" && format(new Date(booking.startAt), "yyyy-MM-dd") === startDate,
      ).length,
    }),
    [bookings, startDate],
  );

  const handleCreateBooking = async () => {
    if (!formData.customerEmail || !formData.serviceSlug || !formData.providerSlug) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const startAt = new Date(`${formData.date}T${formData.time}`);
      const selectedService = services.find(s => s.slug === formData.serviceSlug);
      const endAt = addMinutes(startAt, selectedService?.durationMinutes || 60);

      await createBooking.mutateAsync({
        locationSlug,
        customer: {
          email: formData.customerEmail,
          name: formData.customerName || undefined,
          phone: formData.customerPhone || undefined,
        },
        serviceSlug: formData.serviceSlug,
        providerSlug: formData.providerSlug,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        notes: formData.notes || undefined,
      });

      toast.success("Booking created successfully");
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create booking");
    }
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return;

    try {
      const startAt = new Date(`${formData.date}T${formData.time}`);
      const selectedService = services.find(s => s.slug === formData.serviceSlug);
      const endAt = addMinutes(startAt, selectedService?.durationMinutes || 60);

      await updateBooking.mutateAsync({
        bookingId: selectedBooking.id,
        locationSlug,
        updates: {
          serviceSlug: formData.serviceSlug,
          providerSlug: formData.providerSlug,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          notes: formData.notes || undefined,
        },
      });

      toast.success("Booking updated successfully");
      setIsEditOpen(false);
      setSelectedBooking(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update booking");
    }
  };

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      await deleteBooking.mutateAsync({
        bookingId: bookingToDelete.id,
        locationSlug,
      });

      toast.success("Booking deleted successfully");
      setBookingToDelete(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete booking");
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    try {
      await cancelBooking.mutateAsync({
        bookingId: bookingToCancel.id,
        locationSlug: bookingToCancel.locationSlug,
        customerEmail: bookingToCancel.customer.email,
        reason: "Cancelled by admin",
      });
      toast.success("Booking cancelled successfully");
      setBookingToCancel(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking");
    }
  };

  const openEditDialog = (booking: DaysiAdminBookingRecord) => {
    setSelectedBooking(booking);
    setFormData({
      customerEmail: booking.customer.email,
      customerName: booking.customer.name || "",
      customerPhone: booking.customer.phone || "",
      serviceSlug: booking.serviceSlug,
      providerSlug: booking.providerSlug,
      date: format(new Date(booking.startAt), "yyyy-MM-dd"),
      time: format(new Date(booking.startAt), "HH:mm"),
      notes: booking.notes || "",
    });
    setIsEditOpen(true);
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (const minute of ["00", "30"]) {
        slots.push(`${hour.toString().padStart(2, "0")}:${minute}`);
      }
    }
    return slots;
  }, []);

  const BookingForm = ({ isEditing = false }: { isEditing?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Information
        </h4>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label htmlFor="customerEmail">Email *</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="customer@example.com"
              disabled={isEditing}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="customerName">Name</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="John Doe"
                disabled={isEditing}
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="(555) 123-4567"
                disabled={isEditing}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Service Details
        </h4>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label htmlFor="service">Service *</Label>
            <Select
              value={formData.serviceSlug}
              onValueChange={(value) => setFormData({ ...formData, serviceSlug: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.slug} value={service.slug}>
                    {service.name} ({service.durationMinutes} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="provider">Provider *</Label>
            <Select
              value={formData.providerSlug}
              onValueChange={(value) => setFormData({ ...formData, providerSlug: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.providerSlug} value={provider.providerSlug}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Date & Time
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="time">Time *</Label>
            <Select
              value={formData.time}
              onValueChange={(value) => setFormData({ ...formData, time: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {format(new Date(`2000-01-01T${slot}`), "h:mm a")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label htmlFor="notes" className="flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notes
        </Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any special requests or notes..."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold truncate">Bookings</h1>
          <p className="text-muted-foreground mt-1 truncate">
            Daysi appointment operations
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
          <Button onClick={() => refetch()} variant="outline" disabled={isLoading || isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 min-w-0">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden" onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden" onClick={() => setStatusFilter("confirmed")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Confirmed</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden" onClick={() => setStatusFilter("cancelled")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Cancelled</p>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
              </div>
              <XCircle className="h-8 w-8 text-slate-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden" onClick={() => setStatusFilter("confirmed")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">Today</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
              <Clock className="h-8 w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, service, provider, or notes..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[180px] flex-shrink-0">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="truncate">Appointments ({filteredBookings.length})</CardTitle>
          <CardDescription className="truncate">
            Showing appointments from {format(new Date(startDate), "MMM d")} to {format(new Date(endDate), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground px-4">
              {bookings.length === 0 ? "No appointments scheduled for this period" : "No appointments match your filters"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="hidden md:table-cell">Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => {
                      const statusInfo = getDaysiAdminBookingStatusInfo(booking.status);
                      const isCancellable = booking.status === "confirmed";
                      const customerName = getDaysiAdminBookingCustomerName(booking);
                      const initials = customerName
                        .split(" ")
                        .map((segment) => segment[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <TableRow
                          key={booking.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{format(new Date(booking.startAt), "EEE, MMM d")}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(booking.startAt), "h:mm a")} ({getDaysiAdminBookingDuration(booking)} min)
                              </p>
                            </div>
                          </TableCell>
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium truncate max-w-[150px]">{customerName}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {booking.customer.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[180px]">{booking.serviceName}</p>
                              <p className="text-sm text-muted-foreground">
                                {(booking.charge.finalAmountCents / 100).toFixed(2)} {booking.charge.currency}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm">{booking.providerName}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0 w-fit`}>
                                {statusInfo.label}
                              </Badge>
                              <BookingSourceBadge booking={booking} />
                            </div>
                          </TableCell>
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(booking)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <QuickActions
                                booking={booking}
                                onView={() => setSelectedBooking(booking)}
                                onCancel={() => setBookingToCancel(booking)}
                                isCancellable={isCancellable}
                                isAdmin={isAdmin}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBookingToDelete(booking)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Booking Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
            <DialogDescription>
              Create a new appointment for a customer
            </DialogDescription>
          </DialogHeader>
          <BookingForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBooking}
              disabled={createBooking.isPending}
            >
              {createBooking.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Update appointment details
            </DialogDescription>
          </DialogHeader>
          <BookingForm isEditing />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateBooking}
              disabled={updateBooking.isPending}
            >
              {updateBooking.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingDetailsPanel
        booking={selectedBooking}
        open={!!selectedBooking && !isEditOpen}
        onOpenChange={(nextOpen) => !nextOpen && setSelectedBooking(null)}
        isAdmin={isAdmin}
      />

      {/* Cancel Confirmation */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={() => setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment scheduled for{" "}
              {bookingToCancel && format(new Date(bookingToCancel.startAt), "EEEE, MMMM d 'at' h:mm a")}.
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the appointment for{" "}
              {bookingToDelete && getDaysiAdminBookingCustomerName(bookingToDelete)}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBooking.isPending}
            >
              {deleteBooking.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Booking"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
