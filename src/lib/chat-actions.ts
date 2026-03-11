/**
 * Chat action types for rich interactive messages
 * These allow the AI to trigger UI actions in the chat
 */

import { AvailabilitySlot } from "@/components/chat/AvailabilityPicker";

// Action types the AI can emit
export type ChatAction = 
  | ShowAvailabilityAction
  | ShowBookingFormAction
  | BookingConfirmedAction
  | BookingErrorRecoveryAction
  | TextOnlyAction;

export interface ShowAvailabilityAction {
  type: "show_availability";
  serviceName: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  slots: AvailabilitySlot[];
}

export interface ShowBookingFormAction {
  type: "show_booking_form";
  serviceName: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  selectedTime: string;
}

export interface BookingConfirmedAction {
  type: "booking_confirmed";
  serviceName: string;
  dateTime: string;
  customerName: string;
  bookingId: string;
}

export interface BookingErrorRecoveryAction {
  type: "booking_error_recovery";
  errorCode: string;
  errorMessage: string;
  field?: "phone" | "email" | "slot";
  suggestion?: string;
  originalDetails: {
    name: string;
    email: string;
    phone: string;
  };
  serviceName: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  selectedTime: string;
}

export interface TextOnlyAction {
  type: "text";
  content: string;
}

// Action markers in AI responses
const ACTION_START = "[[ACTION:";
const ACTION_END = "]]";

/**
 * Parse AI response content for embedded actions
 * Format: [[ACTION:{"type":"show_availability",...}]]
 */
export function parseMessageContent(content: string): {
  textContent: string;
  action: ChatAction | null;
} {
  const actionStartIdx = content.indexOf(ACTION_START);
  
  if (actionStartIdx === -1) {
    return { textContent: content, action: null };
  }

  const actionEndIdx = content.indexOf(ACTION_END, actionStartIdx);
  if (actionEndIdx === -1) {
    return { textContent: content, action: null };
  }

  const jsonStr = content.slice(actionStartIdx + ACTION_START.length, actionEndIdx);
  const textContent = (
    content.slice(0, actionStartIdx) + 
    content.slice(actionEndIdx + ACTION_END.length)
  ).trim();

  try {
    const action = JSON.parse(jsonStr) as ChatAction;
    return { textContent, action };
  } catch (e) {
    console.error("Failed to parse chat action:", e);
    return { textContent: content, action: null };
  }
}

/**
 * Create an action marker string for embedding in AI responses
 */
export function createActionMarker(action: ChatAction): string {
  return `${ACTION_START}${JSON.stringify(action)}${ACTION_END}`;
}

/**
 * Check if a message contains an action
 */
export function hasAction(content: string): boolean {
  return content.includes(ACTION_START) && content.includes(ACTION_END);
}
