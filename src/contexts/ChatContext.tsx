import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AvailabilitySlot } from "@/components/chat/AvailabilityPicker";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Structured error for booking recovery
export interface BookingError {
  code: string;
  message: string;
  field?: "phone" | "email" | "slot";
  suggestion?: string;
  originalDetails?: {
    name: string;
    email: string;
    phone: string;
  };
}

// Booking state for in-chat booking flow
export interface BookingState {
  step: "idle" | "selecting_time" | "collecting_details" | "confirming" | "confirmed" | "error_recovery";
  serviceName?: string;
  serviceSlug?: string;
  serviceVariantSlug?: string;
  selectedSlot?: AvailabilitySlot;
  customerDetails?: {
    name: string;
    email: string;
    phone: string;
  };
  lastError?: BookingError;
}

interface ChatContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isProcessingBooking: boolean;
  bookingState: BookingState;
  setIsOpen: (open: boolean) => void;
  openChat: () => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => string;
  updateMessage: (id: string, content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsProcessingBooking: (processing: boolean) => void;
  setBookingState: (state: BookingState) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState>({ step: "idle" });

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setBookingState({ step: "idle" });
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        isProcessingBooking,
        bookingState,
        setIsOpen,
        openChat,
        addMessage,
        updateMessage,
        setIsLoading,
        setIsProcessingBooking,
        setBookingState,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
