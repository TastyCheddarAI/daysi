import { useEffect, useRef } from "react";
import { Bot, ExternalLink, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAIChat } from "@/hooks/useAIChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AvailabilitySlot } from "./AvailabilityPicker";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";

interface MobileChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileChatDrawer({ open, onOpenChange }: MobileChatDrawerProps) {
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

  const handleClose = () => onOpenChange(false);

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] max-h-[90vh] flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Prairie Glow AI</h3>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Typing..." : "Your beauty advisor"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs"
            >
              <Link to="/advisor" onClick={handleClose}>
                <ExternalLink className="h-3 w-3 mr-1" />
                Full Chat
              </Link>
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
        </div>

        {/* Scrollable Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
          {messages.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-medium mb-2">Hi there! 👋</h4>
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

        {/* Suggestions (only when empty) */}
        {showSuggestions && (
          <div className="shrink-0">
            <SuggestedQuestions onSelect={sendMessage} disabled={isLoading} />
          </div>
        )}

        {/* Input pinned to bottom */}
        <div className="shrink-0">
          <ChatInput onSend={sendMessage} disabled={isLoading || isProcessingBooking} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
