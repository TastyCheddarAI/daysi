import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { parseMessageContent, ChatAction } from "@/lib/chat-actions";
import { AvailabilityPicker, AvailabilitySlot } from "./AvailabilityPicker";
import { BookingForm } from "./BookingForm";
import { BookingConfirmation } from "./BookingConfirmation";
import { BookingErrorRecovery } from "./BookingErrorRecovery";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLatest?: boolean;
  onSlotSelect?: (slot: AvailabilitySlot) => void;
  onBookingSubmit?: (details: { name: string; email: string; phone: string }) => void;
  onErrorRetry?: (details: { name: string; email: string; phone: string }) => void;
  onRetryWithoutPhone?: () => void;
  onSelectNewSlot?: () => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  isProcessingBooking?: boolean;
  isLoadingSlots?: boolean;
}

export function ChatMessage({ 
  role, 
  content, 
  isLatest,
  onSlotSelect,
  onBookingSubmit,
  onErrorRetry,
  onRetryWithoutPhone,
  onSelectNewSlot,
  onDateRangeChange,
  isProcessingBooking,
  isLoadingSlots
}: ChatMessageProps) {
  const isAssistant = role === "assistant";
  
  // Parse content for rich actions
  const { textContent, action } = parseMessageContent(content);

  // Render the appropriate action UI
  const renderAction = (action: ChatAction) => {
    switch (action.type) {
      case "show_availability":
        return (
          <div className="mt-3">
            <AvailabilityPicker
              slots={action.slots}
              serviceName={action.serviceName}
              onSelect={(slot) => onSlotSelect?.(slot)}
              onDateRangeChange={onDateRangeChange}
              isLoadingMore={isLoadingSlots}
            />
          </div>
        );
      case "show_booking_form":
        return (
          <div className="mt-3">
            <BookingForm
              serviceName={action.serviceName}
              selectedTime={action.selectedTime}
              onSubmit={(details) => onBookingSubmit?.(details)}
              disabled={isProcessingBooking}
            />
          </div>
        );
      case "booking_confirmed":
        return (
          <div className="mt-3">
            <BookingConfirmation
              serviceName={action.serviceName}
              dateTime={action.dateTime}
              customerName={action.customerName}
            />
          </div>
        );
      case "booking_error_recovery":
        return (
          <div className="mt-3">
            <BookingErrorRecovery
              errorCode={action.errorCode}
              errorMessage={action.errorMessage}
              field={action.field}
              suggestion={action.suggestion}
              originalDetails={action.originalDetails}
              serviceName={action.serviceName}
              selectedTime={action.selectedTime}
              onRetry={(details) => onErrorRetry?.(details)}
              onRetryWithoutPhone={() => onRetryWithoutPhone?.()}
              onSelectNewSlot={() => onSelectNewSlot?.()}
              disabled={isProcessingBooking}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-3 px-4 py-3",
        isAssistant ? "bg-muted/30" : ""
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isAssistant
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {isAssistant ? (
          <Bot className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium mb-1">
          {isAssistant ? "Beauty Advisor" : "You"}
        </p>
        <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
          {textContent}
          {isAssistant && isLatest && textContent && !action && (
            <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse" />
          )}
        </div>
        {/* Render rich action UI */}
        {action && renderAction(action)}
      </div>
    </motion.div>
  );
}
