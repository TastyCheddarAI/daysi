import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";

interface BookingFormProps {
  serviceName: string;
  selectedTime: string;
  onSubmit: (details: { name: string; email: string; phone: string }) => void;
  disabled?: boolean;
}

export function BookingForm({ serviceName, selectedTime, onSubmit, disabled }: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (phone && !/^[\d\s\-()+ ]{7,}$/.test(phone)) {
      newErrors.phone = "Invalid phone format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || disabled) return;
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim() });
  };

  const formattedTime = (() => {
    try {
      const parsed = parseISO(selectedTime);
      return format(parsed, "EEEE, MMM d 'at' h:mm a");
    } catch {
      return selectedTime;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header with selected time */}
      <div className="bg-primary/5 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{serviceName}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{formattedTime}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="booking-name" className="text-xs flex items-center gap-1">
            <User className="w-3 h-3" />
            Your Name
          </Label>
          <Input
            id="booking-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="h-9 text-sm"
            disabled={disabled}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="booking-email" className="text-xs flex items-center gap-1">
            <Mail className="w-3 h-3" />
            Email
          </Label>
          <Input
            id="booking-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="h-9 text-sm"
            disabled={disabled}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="booking-phone" className="text-xs flex items-center gap-1">
            <Phone className="w-3 h-3" />
            Phone (optional)
          </Label>
          <Input
            id="booking-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(204) 555-1234"
            className="h-9 text-sm"
            disabled={disabled}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-10"
          disabled={disabled || !name.trim() || !email.trim()}
        >
          {disabled ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </form>
    </motion.div>
  );
}
