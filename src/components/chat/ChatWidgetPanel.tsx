import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ExternalLink } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAIChat } from "@/hooks/useAIChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AvailabilitySlot } from "./AvailabilityPicker";

interface ChatWidgetPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWidgetPanel({ isOpen, onClose }: ChatWidgetPanelProps) {
  const { messages, isLoading, isProcessingBooking, bookingState } = useChat();
  const { 
    sendMessage, 
    handleSlotSelection, 
    handleBookingSubmit,
    handleErrorRetry,
    handleRetryWithoutPhone,
    handleSelectNewSlot,
    handleDateRangeChange,
    isLoadingSlots
  } = useAIChat("widget");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const showSuggestions = messages.length === 0;

  // Handle time slot selection from AvailabilityPicker
  const onSlotSelect = (slot: AvailabilitySlot) => {
    if (bookingState.serviceSlug && bookingState.serviceVariantSlug && bookingState.serviceName) {
      handleSlotSelection(
        slot,
        bookingState.serviceSlug,
        bookingState.serviceVariantSlug,
        bookingState.serviceName,
      );
    }
  };

  // Handle booking form submission
  const onBookingSubmit = (details: { name: string; email: string; phone: string }) => {
    if (
      bookingState.selectedSlot &&
      bookingState.serviceSlug &&
      bookingState.serviceVariantSlug &&
      bookingState.serviceName
    ) {
      handleBookingSubmit(
        details,
        bookingState.selectedSlot,
        bookingState.serviceSlug,
        bookingState.serviceVariantSlug,
        bookingState.serviceName,
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-16 right-0 w-[380px] max-w-[calc(100vw-2rem)] bg-background border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: "min(500px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-primary/5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Prairie Glow AI</h3>
              <p className="text-xs text-muted-foreground">
                {isProcessingBooking ? "Booking..." : isLoading ? "Typing..." : "Your beauty advisor"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs"
            >
              <Link to="/advisor" onClick={onClose}>
                <ExternalLink className="h-3 w-3 mr-1" />
                Full Chat
              </Link>
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
            {messages.length === 0 ? (
              <div className="p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Hi there! 👋</h4>
                <p className="text-sm text-muted-foreground">
                  I'm your personal beauty advisor. Ask me about our treatments, pricing, or skincare tips!
                </p>
              </div>
            ) : (
              <div className="py-2">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    isLatest={idx === messages.length - 1 && msg.role === "assistant" && isLoading}
                    onSlotSelect={onSlotSelect}
                    onBookingSubmit={onBookingSubmit}
                    onErrorRetry={handleErrorRetry}
                    onRetryWithoutPhone={handleRetryWithoutPhone}
                    onSelectNewSlot={handleSelectNewSlot}
                    onDateRangeChange={handleDateRangeChange}
                    isProcessingBooking={isProcessingBooking}
                    isLoadingSlots={isLoadingSlots}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Suggestions or Loading */}
          {showSuggestions && (
            <SuggestedQuestions onSelect={sendMessage} disabled={isLoading} />
          )}

          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={isLoading || isProcessingBooking} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
