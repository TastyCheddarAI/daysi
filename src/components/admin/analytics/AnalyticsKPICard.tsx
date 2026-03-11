import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SparklineChart } from "../revenue/SparklineChart";

interface AnalyticsKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    change: number;
    percentage: number;
  };
  sparklineData?: number[];
  suffix?: string;
  invertTrend?: boolean; // For metrics where down is good (bounce rate)
  className?: string;
}

export function AnalyticsKPICard({
  title,
  value,
  icon: Icon,
  change,
  sparklineData,
  suffix = "",
  invertTrend = false,
  className,
}: AnalyticsKPICardProps) {
  const getTrendInfo = () => {
    if (!change) return null;
    
    const isPositive = invertTrend ? change.percentage < 0 : change.percentage > 0;
    const isNeutral = Math.abs(change.percentage) < 0.5;
    
    if (isNeutral) {
      return {
        icon: Minus,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      };
    }
    
    return {
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? "text-emerald-600" : "text-red-600",
      bgColor: isPositive ? "bg-emerald-500/10" : "bg-red-500/10",
    };
  };

  const trend = getTrendInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{title}</span>
              </div>
              
              <motion.div
                className="text-3xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={value}
              >
                {typeof value === "number" ? value.toLocaleString() : value}
                {suffix && <span className="text-lg font-normal text-muted-foreground ml-1">{suffix}</span>}
              </motion.div>

              {trend && change && (
                <div className={cn("flex items-center gap-1 mt-2 text-sm", trend.color)}>
                  <trend.icon className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {change.percentage >= 0 ? "+" : ""}
                    {change.percentage.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs previous</span>
                </div>
              )}
            </div>

            {sparklineData && sparklineData.length > 1 && (
              <div className="w-24 h-12">
                <SparklineChart
                  data={sparklineData.map(v => ({ value: v }))}
                  color={trend?.color.includes("emerald") ? "hsl(var(--chart-2))" : "hsl(var(--primary))"}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
