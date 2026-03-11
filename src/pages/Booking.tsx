import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDaysiBooking,
  useDaysiAvailability,
  useDaysiBookableServices,
} from "@/hooks/useDaysiPublicBooking";
import {
  DAYSI_DEFAULT_LOCATION_SLUG,
  formatDaysiAvailabilityTime,
  getDaysiCategoryLabel,
  groupAvailabilitySlotsByDate,
  splitCustomerName,
  type DaysiAvailabilitySlot,
  type DaysiPublicService,
} from "@/lib/daysi-public-api";

const Booking = () => {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const [searchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedService, setSelectedService] = useState<DaysiPublicService | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<DaysiAvailabilitySlot | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const { data: allServices, isLoading: loadingServices } = useDaysiBookableServices(locationSlug);
  const startDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const endDate = useMemo(() => format(addDays(new Date(), 14), "yyyy-MM-dd"), []);
  const { data: availabilitySlots, isLoading: loadingSlots } = useDaysiAvailability({
    locationSlug,
    serviceSlug: selectedService?.slug ?? null,
    fromDate: startDate,
    toDate: endDate,
    pricingMode: "retail",
  });
  const createBooking = useCreateDaysiBooking();

  const categories = useMemo(
    () =>
      [...new Set((allServices ?? []).map((service) => service.categorySlug))].sort((left, right) =>
        getDaysiCategoryLabel(left).localeCompare(getDaysiCategoryLabel(right)),
      ),
    [allServices],
  );

  const services = useMemo(
    () =>
      (allServices ?? []).filter((service) =>
        selectedCategory ? service.categorySlug === selectedCategory : true,
      ),
    [allServices, selectedCategory],
  );

  const slotsByDate = useMemo(
    () => groupAvailabilitySlotsByDate(availabilitySlots ?? []),
    [availabilitySlots],
  );
  const availableDates = useMemo(() => [...slotsByDate.keys()].sort(), [slotsByDate]);
  const slotsForSelectedDate = selectedDate ? slotsByDate.get(selectedDate) ?? [] : [];

  useEffect(() => {
    const requestedServiceSlug = searchParams.get("service");
    if (!requestedServiceSlug || !allServices?.length || selectedService) {
      return;
    }

    const requestedService = allServices.find(
      (service) => service.slug === requestedServiceSlug,
    );
    if (!requestedService) {
      return;
    }

    setSelectedCategory(requestedService.categorySlug);
    setSelectedService(requestedService);
  }, [allServices, searchParams, selectedService]);

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSelectedService(null);
    setSelectedDate("");
    setSelectedSlot(null);
  };

  const handleServiceSelect = (service: DaysiPublicService) => {
    setSelectedService(service);
    setSelectedDate("");
    setSelectedSlot(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedService || !selectedSlot) {
      toast.error("Please select a treatment and time slot.");
      return;
    }

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const customerName = splitCustomerName(formData.name);

    try {
      const result = await createBooking.mutateAsync({
        locationSlug,
        serviceSlug: selectedService.slug,
        serviceVariantSlug: selectedService.variantSlug,
        slotId: selectedSlot.slotId,
        pricingMode: "retail",
        customer: {
          firstName: customerName.firstName,
          lastName: customerName.lastName,
          email: formData.email,
          phone: formData.phone,
        },
        notes: formData.notes || undefined,
      });

      toast.success(
        `Appointment booked. Confirmation code: ${result.booking.code}.`,
      );

      setFormData({ name: "", email: "", phone: "", notes: "" });
      setSelectedCategory("");
      setSelectedDate("");
      setSelectedSlot(null);
      setSelectedService(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to book appointment.");
    }
  };

  return (
    <Layout>
      <SEO
        title="Book Treatments Online | Daysi"
        description="Book Daysi treatments with real-time provider, machine, and room availability."
        keywords="Daysi booking, laser treatment booking, skin treatment booking"
        canonical="/booking"
      />

      <section className="pt-32 pb-16 bg-secondary/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl font-semibold mb-6">
              Book Daysi Treatments Online
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Live availability now comes from the Daysi platform, with provider,
              machine, and room capacity resolved before you book.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <motion.form
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="grid md:grid-cols-2 gap-12"
            >
              <div className="space-y-8 min-w-0 max-w-full overflow-hidden">
                <div>
                  <label className="block font-serif text-xl font-semibold mb-4">
                    <Sparkles className="w-5 h-5 inline mr-2 text-primary" />
                    Treatment Category
                  </label>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-14 text-lg rounded-xl">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((categorySlug) => (
                        <SelectItem key={categorySlug} value={categorySlug}>
                          {getDaysiCategoryLabel(categorySlug)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory && (
                  <div>
                    <label className="block font-serif text-xl font-semibold mb-4">
                      <Sparkles className="w-5 h-5 inline mr-2 text-primary" />
                      Select Treatment
                    </label>
                    {loadingServices ? (
                      <div className="flex items-center justify-center h-14 bg-muted rounded-xl">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : services.length === 0 ? (
                      <div className="flex items-center gap-2 p-4 bg-muted rounded-xl text-muted-foreground">
                        <AlertCircle className="w-5 h-5" />
                        <span>No treatments are available in this category yet.</span>
                      </div>
                    ) : (
                      <Select
                        value={selectedService?.id || ""}
                        onValueChange={(serviceId) => {
                          const service = services.find((entry) => entry.id === serviceId);
                          if (service) {
                            handleServiceSelect(service);
                          }
                        }}
                      >
                        <SelectTrigger className="h-14 text-lg rounded-xl">
                          <SelectValue placeholder="Choose a treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 min-w-0">
                                <span className="truncate">{service.name}</span>
                                <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                                  ${(service.price.retailAmountCents / 100).toFixed(2)} CAD
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {selectedService && (
                  <div>
                    <label className="block font-serif text-xl font-semibold mb-4">
                      <Calendar className="w-5 h-5 inline mr-2 text-primary" />
                      Select Date
                    </label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center h-14 bg-muted rounded-xl">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableDates.length === 0 ? (
                      <div className="flex items-center gap-2 p-4 bg-muted rounded-xl text-muted-foreground">
                        <AlertCircle className="w-5 h-5" />
                        <span>No availability in the next 14 days. Please contact Daysi directly.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableDates.map((date) => (
                          <button
                            key={date}
                            type="button"
                            onClick={() => {
                              setSelectedDate(date);
                              setSelectedSlot(null);
                            }}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                              selectedDate === date
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="text-xs uppercase">{format(parseISO(date), "EEE")}</div>
                            <div className="text-lg font-semibold">{format(parseISO(date), "d")}</div>
                            <div className="text-xs">{format(parseISO(date), "MMM")}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedDate && slotsForSelectedDate.length > 0 && (
                  <div>
                    <label className="block font-serif text-xl font-semibold mb-4">
                      <Clock className="w-5 h-5 inline mr-2 text-primary" />
                      Select Time
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {slotsForSelectedDate.map((slot) => (
                        <button
                          key={slot.slotId}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            selectedSlot?.slotId === slot.slotId
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-semibold">
                            {formatDaysiAvailabilityTime(slot.startAt)}
                          </div>
                          <div className="text-xs opacity-80">{slot.providerName}</div>
                          <div className="text-xs opacity-80">
                            {slot.machineName}
                            {slot.roomName ? ` · ${slot.roomName}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedService && (
                  <div className="bg-secondary/50 rounded-2xl p-6">
                    <h3 className="font-serif text-lg font-semibold mb-4">{selectedService.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedService.shortDescription}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-semibold">
                          ${(selectedService.price.retailAmountCents / 100).toFixed(2)} CAD
                        </span>
                      </div>
                      {selectedService.price.memberAmountCents ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Member Price</span>
                          <span className="font-semibold text-primary">
                            ${(selectedService.price.memberAmountCents / 100).toFixed(2)} CAD
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-semibold">{selectedService.durationMinutes} min</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <h2 className="font-serif text-2xl font-semibold">Your Information</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData({ ...formData, name: event.target.value })
                    }
                    placeholder="Your name"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(event) =>
                      setFormData({ ...formData, email: event.target.value })
                    }
                    placeholder="you@example.com"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number *</label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData({ ...formData, phone: event.target.value })
                    }
                    placeholder="(204) 555-1234"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Special Notes or Concerns
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(event) =>
                      setFormData({ ...formData, notes: event.target.value })
                    }
                    placeholder="Any skin concerns, allergies, or treatment notes..."
                    className="min-h-[120px] rounded-xl resize-none"
                  />
                </div>

                <Button
                  variant="hero"
                  size="xl"
                  type="submit"
                  className="w-full"
                  disabled={createBooking.isPending || !selectedService || !selectedSlot}
                >
                  {createBooking.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      Book Appointment
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Daysi will send your confirmation details as soon as the booking is created.
                </p>
              </div>
            </motion.form>
          </div>
        </div>
      </section>

      <section className="py-24 bg-secondary/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-serif text-3xl font-semibold text-center mb-12">
              What to Expect
            </h2>
            <div className="space-y-6">
              {[
                "Live slot availability based on provider, machine, and room capacity.",
                "Immediate booking confirmation once your appointment is reserved.",
                "Operationally valid time slots only. No fake availability.",
                "Clear treatment details, pricing, and appointment timing before submission.",
                "A booking record that is already aligned with the new Daysi platform.",
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-lg">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Booking;
