import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, Eye, MousePointerClick, CheckCircle2 } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  icon: React.ElementType;
}

interface ConversionFunnelProps {
  funnel: {
    visitors: number;
    serviceViews: number;
    bookingStarts: number;
    bookingCompletes: number;
  };
}

export function ConversionFunnel({ funnel }: ConversionFunnelProps) {
  const stages: FunnelStage[] = [
    { name: "Visitors", count: funnel.visitors, icon: Users },
    { name: "Viewed Services", count: funnel.serviceViews, icon: Eye },
    { name: "Started Booking", count: funnel.bookingStarts, icon: MousePointerClick },
    { name: "Completed Booking", count: funnel.bookingCompletes, icon: CheckCircle2 },
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="truncate">Booking Conversion Funnel</CardTitle>
        <CardDescription className="truncate">
          Track how visitors convert through the booking journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const conversionFromPrevious = index > 0 && stages[index - 1].count > 0
              ? (stage.count / stages[index - 1].count) * 100
              : 100;
            const dropOff = 100 - conversionFromPrevious;
            const Icon = stage.icon;

            return (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex items-center gap-2 sm:gap-4 mb-2">
                  <div className="flex items-center gap-2 min-w-0 w-[120px] sm:w-[160px] flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium truncate">{stage.name}</span>
                  </div>
                  
                  <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden relative">
                    <motion.div
                      className={cn(
                        "h-full rounded-lg",
                        index === 0 && "bg-primary",
                        index === 1 && "bg-primary/80",
                        index === 2 && "bg-primary/60",
                        index === 3 && "bg-emerald-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.15 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-foreground mix-blend-difference">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-[50px] sm:min-w-[80px] text-right flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium">
                      {(stage.count / maxCount * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {index > 0 && dropOff > 0 && (
                  <div className="ml-[136px] sm:ml-[176px] text-xs text-muted-foreground mb-2">
                    <span className="text-red-500">↓ {dropOff.toFixed(1)}%</span> <span className="hidden sm:inline">drop-off from previous stage</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {funnel.visitors > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Conversion Rate</span>
              <span className="font-bold text-lg text-emerald-600">
                {((funnel.bookingCompletes / funnel.visitors) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
