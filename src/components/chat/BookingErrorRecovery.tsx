import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Phone, Mail, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";

interface BookingErrorRecoveryProps {
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
  selectedTime: string;
  onRetry: (details: { name: string; email: string; phone: string }) => void;
  onRetryWithoutPhone: () => void;
  onSelectNewSlot?: () => void;
  disabled?: boolean;
}

// Format phone as user types
function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// Validate phone has enough digits
function isValidPhone(phone: string): boolean {
  if (!phone.trim()) return true; // Empty is valid (optional)
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function BookingErrorRecovery({
  errorCode,
  errorMessage,
  field,
  suggestion,
  originalDetails,
  serviceName,
  selectedTime,
  onRetry,
  onRetryWithoutPhone,
  onSelectNewSlot,
  disabled,
}: BookingErrorRecoveryProps) {
  const [name] = useState(originalDetails.name);
  const [email, setEmail] = useState(originalDetails.email);
  const [phone, setPhone] = useState(formatPhoneDisplay(originalDetails.phone));
  const [fieldFixed, setFieldFixed] = useState(false);

  const formattedTime = (() => {
    try {
      return format(parseISO(selectedTime), "EEEE, MMM d 'at' h:mm a");
    } catch {
      return selectedTime;
    }
  })();

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneDisplay(value);
    setPhone(formatted);
    // Mark as fixed if it now has valid length
    if (field === "phone" && isValidPhone(formatted)) {
      setFieldFixed(true);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (field === "email" && isValidEmail(value)) {
      setFieldFixed(true);
    }
  };

  const handleRetry = () => {
    onRetry({
      name,
      email: email.trim(),
      phone: phone.replace(/\D/g, ""), // Send digits only
    });
  };

  const isPhoneError = field === "phone" || errorCode === "INVALID_PHONE_NUMBER";
  const isEmailError = field === "email" || errorCode === "INVALID_EMAIL";
  const isSlotError = field === "slot" || errorCode === "SLOT_UNAVAILABLE";

  // Determine if retry is possible
  const canRetry = isSlotError 
    ? false // Slot errors need new selection
    : isPhoneError 
      ? isValidPhone(phone) || phone.trim() === ""
      : isEmailError
        ? isValidEmail(email)
        : true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-amber-200 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
            Quick Fix Needed
          </span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          {errorMessage}
        </p>
      </div>

      {/* Appointment info */}
      <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span>{serviceName}</span>
        <span>•</span>
        <span>{formattedTime}</span>
      </div>

      {/* Error-specific fix UI */}
      <div className="p-4 space-y-3">
        {isPhoneError && (
          <div className="space-y-1">
            <Label htmlFor="recovery-phone" className="text-xs flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Phone (optional)
            </Label>
            <div className="relative">
              <Input
                id="recovery-phone"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(204) 555-1234"
                className={`h-9 text-sm pr-8 ${fieldFixed ? "border-green-500 focus-visible:ring-green-500" : "border-amber-500 focus-visible:ring-amber-500"}`}
                disabled={disabled}
              />
              {fieldFixed && (
                <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
            {suggestion && (
              <p className="text-xs text-muted-foreground">{suggestion}</p>
            )}
            {fieldFixed && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Looks good now!
              </p>
            )}
          </div>
        )}

        {isEmailError && (
          <div className="space-y-1">
            <Label htmlFor="recovery-email" className="text-xs flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email
            </Label>
            <div className="relative">
              <Input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
                className={`h-9 text-sm pr-8 ${fieldFixed ? "border-green-500 focus-visible:ring-green-500" : "border-amber-500 focus-visible:ring-amber-500"}`}
                disabled={disabled}
              />
              {fieldFixed && (
                <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
            {suggestion && (
              <p className="text-xs text-muted-foreground">{suggestion}</p>
            )}
          </div>
        )}

        {isSlotError && (
          <div className="text-center py-2">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-amber-600" />
            <p className="text-sm text-muted-foreground mb-2">
              {suggestion || "That time was just booked. Let's find another!"}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {isSlotError ? (
            <Button
              onClick={onSelectNewSlot}
              className="w-full h-10"
              disabled={disabled}
            >
              {disabled ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Choose Another Time"
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleRetry}
                className="flex-1 h-10"
                disabled={disabled || !canRetry}
              >
                {disabled ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Try Again"
                )}
              </Button>
              {isPhoneError && (
                <Button
                  variant="outline"
                  onClick={onRetryWithoutPhone}
                  className="flex-1 h-10"
                  disabled={disabled}
                >
                  Book Without Phone
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
