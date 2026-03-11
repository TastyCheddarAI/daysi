import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RealtimeVisitorsProps {
  count: number;
  className?: string;
}

export function RealtimeVisitors({ count, className }: RealtimeVisitorsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        className="relative"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      <span className="text-sm font-medium">
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-foreground"
        >
          {count}
        </motion.span>{" "}
        <span className="text-muted-foreground">online now</span>
      </span>
    </div>
  );
}
