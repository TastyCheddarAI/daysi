import { useCallback, useState } from "react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";

import { type AvailabilitySlot } from "@/components/chat/AvailabilityPicker";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND_CONFIG } from "@/lib/brand.config";
import { createActionMarker } from "@/lib/chat-actions";
import { fetchDaysiBookingAssistantChat } from "@/lib/daysi-ai-api";
import {
  createDaysiBooking,
  DAYSI_DEFAULT_LOCATION_SLUG,
  listDaysiPublicServices,
  searchDaysiAvailability,
  splitCustomerName,
  type DaysiAvailabilitySlot,
  type DaysiPublicService,
} from "@/lib/daysi-public-api";

const BOOKING_INTENT_PATTERN =
  /\b(book|booking|availability|available|schedule|appointment|time|times)\b/i;

const stripActionMarkup = (content: string): string =>
  content
    .replace(/\[\[ACTION:[\s\S]*?\]\]/g, "")
    .replace(/\[\[BOOK_SERVICE:[^\]]+\]\]/g, "")
    .trim();

const formatDateRange = (startDate: Date, endDate: Date) => ({
  fromDate: format(startDate, "yyyy-MM-dd"),
  toDate: format(endDate, "yyyy-MM-dd"),
});

const normalizeAvailabilitySlot = (
  slot: DaysiAvailabilitySlot,
  service: DaysiPublicService,
): AvailabilitySlot => ({
  slotId: slot.slotId,
  start_at: slot.startAt,
  end_at: slot.endAt,
  service_slug: service.slug,
  service_variant_slug: service.variantSlug,
  provider_name: slot.providerName,
  provider_slug: slot.providerSlug,
  machine_name: slot.machineName,
  room_name: slot.roomName,
});

const formatAssistantReply = (input: {
  message: string;
  membershipPlanSlugs: string[];
  nextActions: string[];
}): string => {
  const sections = [input.message.trim()];

  if (input.membershipPlanSlugs.length > 0) {
    sections.push(`Membership options: ${input.membershipPlanSlugs.join(", ")}.`);
  }

  if (input.nextActions.length > 0) {
    sections.push(`Next steps:\n- ${input.nextActions.join("\n- ")}`);
  }

  return sections.filter(Boolean).join("\n\n");
};

const buildSlotUnavailableRecovery = (input: {
  details: { name: string; email: string; phone: string };
  serviceName: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  selectedTime: string;
}) =>
  createActionMarker({
    type: "booking_error_recovery" as const,
    errorCode: "slot_unavailable",
    errorMessage: "That time is no longer available.",
    field: "slot" as const,
    suggestion: "Pick another available time and I will try again.",
    originalDetails: input.details,
    serviceName: input.serviceName,
    serviceSlug: input.serviceSlug,
    serviceVariantSlug: input.serviceVariantSlug,
    selectedTime: input.selectedTime,
  });

export function useAIChat(mode: "widget" | "advisor" = "widget") {
  const {
    messages,
    addMessage,
    isLoading,
    setIsLoading,
    isProcessingBooking,
    setIsProcessingBooking,
    setBookingState,
    bookingState,
  } = useChat();
  const { session } = useAuth();
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const triggerAvailabilitySearch = useCallback(
    async (
      serviceName: string,
      serviceSlug: string,
      serviceVariantSlug: string,
      startDate?: Date,
      endDate?: Date,
    ) => {
      setIsLoading(true);
      setIsLoadingSlots(true);

      try {
        const searchStart = startDate ?? new Date();
        const searchEnd = endDate ?? addDays(searchStart, 30);
        const dateRange = formatDateRange(searchStart, searchEnd);
        const slots = await searchDaysiAvailability({
          locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
          serviceSlug,
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          pricingMode: "retail",
        });

        const normalizedSlots = slots
          .slice(0, 20)
          .map((slot) =>
            normalizeAvailabilitySlot(slot, {
              id: serviceSlug,
              slug: serviceSlug,
              variantSlug: serviceVariantSlug,
              categorySlug: "",
              locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
              name: serviceName,
              shortDescription: "",
              durationMinutes: 0,
              bookable: true,
              price: slot.price,
              machineCapabilities: [],
              roomCapabilities: [],
              featureTags: [],
            }),
          );

        setBookingState({
          step: "selecting_time",
          serviceName,
          serviceSlug,
          serviceVariantSlug,
        });

        const actionMarker = createActionMarker({
          type: "show_availability",
          serviceName,
          serviceSlug,
          serviceVariantSlug,
          slots: normalizedSlots,
        });

        if (normalizedSlots.length > 0) {
          addMessage({
            role: "assistant",
            content: `Here are the available times: ${actionMarker}`,
          });
        } else {
          addMessage({
            role: "assistant",
            content: `I couldn't find any available times right now. Please call us at ${BRAND_CONFIG.FALLBACK_PHONE} and we will find a time that works.`,
          });
        }
      } catch (error) {
        console.error("Availability search error:", error);
        addMessage({
          role: "assistant",
          content: `I couldn't check availability right now. Please call us at ${BRAND_CONFIG.FALLBACK_PHONE} to book.`,
        });
      } finally {
        setIsLoading(false);
        setIsLoadingSlots(false);
      }
    },
    [addMessage, setBookingState, setIsLoading],
  );

  const sendMessage = useCallback(
    async (content: string, options?: { appendUser?: boolean }) => {
      if (!content.trim() || isLoading) {
        return;
      }

      const shouldAppendUser = options?.appendUser ?? true;
      if (shouldAppendUser) {
        addMessage({ role: "user", content: content.trim() });
      }
      setIsLoading(true);

      const apiMessages = [
        ...messages.map((message) => ({
          role: message.role,
          content: stripActionMarkup(message.content),
        })),
        ...(shouldAppendUser
          ? [{ role: "user" as const, content: content.trim() }]
          : []),
      ].filter((message) => message.content.length > 0);

      try {
        const response = await fetchDaysiBookingAssistantChat({
          token: session?.access_token,
          locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
          messages: apiMessages,
        });

        const suggestedServices = response.answer.suggestedServiceSlugs.length
          ? (await listDaysiPublicServices(DAYSI_DEFAULT_LOCATION_SLUG)).filter((service) =>
              response.answer.suggestedServiceSlugs.includes(service.slug),
            )
          : [];

        addMessage({
          role: "assistant",
          content: formatAssistantReply({
            message: response.answer.message,
            membershipPlanSlugs: response.answer.suggestedMembershipPlanSlugs,
            nextActions: response.answer.nextActions,
          }),
        });

        const primaryService = suggestedServices[0];
        if (
          mode === "widget" &&
          primaryService &&
          BOOKING_INTENT_PATTERN.test(content)
        ) {
          await triggerAvailabilitySearch(
            primaryService.name,
            primaryService.slug,
            primaryService.variantSlug,
          );
          return;
        }
      } catch (error) {
        console.error("Chat error:", error);
        addMessage({
          role: "assistant",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again or call us directly.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, isLoading, messages, mode, session?.access_token, setIsLoading, triggerAvailabilitySearch],
  );

  const handleDateRangeChange = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!bookingState.serviceSlug || !bookingState.serviceVariantSlug || !bookingState.serviceName) {
        return;
      }

      setIsLoadingSlots(true);

      try {
        const dateRange = formatDateRange(startDate, endDate);
        const slots = await searchDaysiAvailability({
          locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
          serviceSlug: bookingState.serviceSlug,
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          pricingMode: "retail",
        });

        const actionMarker = createActionMarker({
          type: "show_availability",
          serviceName: bookingState.serviceName,
          serviceSlug: bookingState.serviceSlug,
          serviceVariantSlug: bookingState.serviceVariantSlug,
          slots: slots
            .slice(0, 20)
            .map((slot) =>
              normalizeAvailabilitySlot(slot, {
                id: bookingState.serviceSlug!,
                slug: bookingState.serviceSlug!,
                variantSlug: bookingState.serviceVariantSlug!,
                categorySlug: "",
                locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
                name: bookingState.serviceName!,
                shortDescription: "",
                durationMinutes: 0,
                bookable: true,
                price: slot.price,
                machineCapabilities: [],
                roomCapabilities: [],
                featureTags: [],
              }),
            ),
        });

        addMessage({
          role: "assistant",
          content: `Here are times for your selected dates: ${actionMarker}`,
        });
      } catch (error) {
        console.error("Date range fetch error:", error);
        toast.error("Couldn't load times for that date.");
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [addMessage, bookingState],
  );

  const handleSlotSelection = useCallback(
    async (
      slot: AvailabilitySlot,
      serviceSlug: string,
      serviceVariantSlug: string,
      serviceName: string,
    ) => {
      setBookingState({
        step: "collecting_details",
        serviceName,
        serviceSlug,
        serviceVariantSlug,
        selectedSlot: slot,
      });

      const actionMarker = createActionMarker({
        type: "show_booking_form",
        serviceName,
        serviceSlug,
        serviceVariantSlug,
        selectedTime: slot.start_at,
      });

      addMessage({
        role: "assistant",
        content: `Great choice! I just need a few quick details to confirm your ${serviceName} appointment. ${actionMarker}`,
      });
    },
    [addMessage, setBookingState],
  );

  const handleBookingSubmit = useCallback(
    async (
      details: { name: string; email: string; phone: string },
      slot: AvailabilitySlot,
      serviceSlug: string,
      serviceVariantSlug: string,
      serviceName: string,
    ) => {
      setIsProcessingBooking(true);
      setBookingState({
        step: "confirming",
        serviceName,
        serviceSlug,
        serviceVariantSlug,
        selectedSlot: slot,
        customerDetails: details,
      });

      try {
        const customerName = splitCustomerName(details.name);
        const booking = await createDaysiBooking({
          locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
          serviceSlug,
          serviceVariantSlug,
          slotId: slot.slotId,
          pricingMode: "retail",
          customer: {
            firstName: customerName.firstName,
            lastName: customerName.lastName,
            email: details.email,
            phone: details.phone || undefined,
          },
        });

        addMessage({
          role: "assistant",
          content: `You're all set! ${createActionMarker({
            type: "booking_confirmed",
            serviceName,
            dateTime: slot.start_at,
            customerName: details.name,
            bookingId: booking.booking.id,
          })}`,
        });

        setBookingState({
          step: "confirmed",
          serviceName,
          serviceSlug,
          serviceVariantSlug,
          selectedSlot: slot,
          customerDetails: details,
        });

        toast.success("Booking confirmed! Check your email for details.");
      } catch (error) {
        console.error("Booking error:", error);
        const message =
          error instanceof Error ? error.message : "Couldn't complete your booking.";

        if (message.toLowerCase().includes("slot is no longer available")) {
          setBookingState({
            step: "error_recovery",
            serviceName,
            serviceSlug,
            serviceVariantSlug,
            selectedSlot: slot,
            customerDetails: details,
            lastError: {
              code: "slot_unavailable",
              message,
              field: "slot",
              suggestion: "Pick another available time and I will try again.",
              originalDetails: details,
            },
          });

          addMessage({
            role: "assistant",
            content: `That time just disappeared from the calendar. ${buildSlotUnavailableRecovery({
              details,
              serviceName,
              serviceSlug,
              serviceVariantSlug,
              selectedTime: slot.start_at,
            })}`,
          });
        } else {
          toast.error(message);
          addMessage({
            role: "assistant",
            content: `I couldn't complete your booking. Please try again or call us at ${BRAND_CONFIG.FALLBACK_PHONE} and we will help directly.`,
          });
          setBookingState({ step: "idle" });
        }
      } finally {
        setIsProcessingBooking(false);
      }
    },
    [addMessage, setBookingState, setIsProcessingBooking],
  );

  const handleErrorRetry = useCallback(
    async (details: { name: string; email: string; phone: string }) => {
      if (
        !bookingState.selectedSlot ||
        !bookingState.serviceSlug ||
        !bookingState.serviceVariantSlug ||
        !bookingState.serviceName
      ) {
        return;
      }

      await handleBookingSubmit(
        details,
        bookingState.selectedSlot,
        bookingState.serviceSlug,
        bookingState.serviceVariantSlug,
        bookingState.serviceName,
      );
    },
    [bookingState, handleBookingSubmit],
  );

  const handleRetryWithoutPhone = useCallback(async () => {
    if (
      !bookingState.selectedSlot ||
      !bookingState.serviceSlug ||
      !bookingState.serviceVariantSlug ||
      !bookingState.serviceName ||
      !bookingState.customerDetails
    ) {
      return;
    }

    await handleBookingSubmit(
      { ...bookingState.customerDetails, phone: "" },
      bookingState.selectedSlot,
      bookingState.serviceSlug,
      bookingState.serviceVariantSlug,
      bookingState.serviceName,
    );
  }, [bookingState, handleBookingSubmit]);

  const handleSelectNewSlot = useCallback(async () => {
    if (!bookingState.serviceSlug || !bookingState.serviceVariantSlug || !bookingState.serviceName) {
      return;
    }

    await triggerAvailabilitySearch(
      bookingState.serviceName,
      bookingState.serviceSlug,
      bookingState.serviceVariantSlug,
    );
  }, [bookingState, triggerAvailabilitySearch]);

  return {
    sendMessage,
    handleSlotSelection,
    handleBookingSubmit,
    handleErrorRetry,
    handleRetryWithoutPhone,
    handleSelectNewSlot,
    handleDateRangeChange,
    triggerAvailabilitySearch,
    isLoading,
    isLoadingSlots,
    isProcessingBooking,
  };
}
