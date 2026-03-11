import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { SparklineChart } from "./SparklineChart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

interface KPICardProps {
  title: string;
  value: number;
  formatter?: (value: number) => string;
  change?: number;
  changeLabel?: string;
  secondaryValue?: string;
  icon?: React.ReactNode;
  sparklineData?: Array<{ value: number }>;
  target?: number;
  targetLabel?: string;
  tooltip?: string;
  className?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

export function KPICard({
  title,
  value,
  formatter = (v) => v.toLocaleString(),
  change,
  changeLabel = "vs previous period",
  secondaryValue,
  icon,
  sparklineData,
  target,
  targetLabel,
  tooltip,
  className,
  variant = "default",
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const isPositiveChange = change !== undefined && change >= 0;

  // Animate value on mount
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (value - startValue) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value]);

  const targetProgress = target ? Math.min((value / target) * 100, 100) : undefined;

  const variantStyles = {
    default: "bg-card",
    primary: "bg-primary/5 border-primary/20",
    success: "bg-green-500/5 border-green-500/20",
    warning: "bg-amber-500/5 border-amber-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        variantStyles[variant],
        className
      )}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {icon && (
              <div className="flex-shrink-0 text-muted-foreground">
                {icon}
              </div>
            )}
          </div>

          <div className="mt-2">
            <motion.div
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {formatter(displayValue)}
            </motion.div>

            {change !== undefined && (
              <div className="flex items-center gap-1.5 mt-1">
                {isPositiveChange ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  isPositiveChange ? "text-green-500" : "text-red-500"
                )}>
                  {isPositiveChange ? "+" : ""}{change.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              </div>
            )}

            {secondaryValue && (
              <p className="text-xs text-muted-foreground mt-1">{secondaryValue}</p>
            )}
          </div>

          {sparklineData && sparklineData.length > 1 && (
            <div className="mt-4">
              <SparklineChart data={sparklineData} />
            </div>
          )}

          {target && targetProgress !== undefined && (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{targetLabel || "Target"}</span>
                <span className="font-medium">{targetProgress.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    targetProgress >= 100 ? "bg-green-500" : "bg-primary"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${targetProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
