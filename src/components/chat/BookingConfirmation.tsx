import { motion } from "framer-motion";
import { CheckCircle2, Calendar, Clock, MapPin, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";

interface BookingConfirmationProps {
  serviceName: string;
  dateTime: string;
  customerName: string;
  location?: string;
}

export function BookingConfirmation({ 
  serviceName, 
  dateTime, 
  customerName,
  location = "Prairie Glow Beauty"
}: BookingConfirmationProps) {
  const formattedDate = (() => {
    try {
      const parsed = parseISO(dateTime);
      return {
        date: format(parsed, "EEEE, MMMM d, yyyy"),
        time: format(parsed, "h:mm a"),
      };
    } catch {
      return { date: dateTime, time: "" };
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border rounded-xl overflow-hidden shadow-sm"
    >
      {/* Success header */}
      <div className="bg-green-500/10 px-4 py-4 text-center border-b">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </motion.div>
        <h4 className="font-semibold text-green-700">Booking Confirmed!</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Confirmation sent to your email
        </p>
      </div>

      {/* Booking details */}
      <div className="p-4 space-y-3">
        {/* Service */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{serviceName}</p>
            <p className="text-xs text-muted-foreground">for {customerName}</p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{formattedDate.date}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formattedDate.time}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{location}</p>
            <p className="text-xs text-muted-foreground">See you soon! 💜</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
