import { Line, LineChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineChartProps {
  data: Array<{ value: number }>;
  color?: string;
  className?: string;
  showGradient?: boolean;
}

export function SparklineChart({
  data,
  color = "hsl(var(--primary))",
  className,
  showGradient = true,
}: SparklineChartProps) {
  if (!data || data.length < 2) {
    return null;
  }

  // Determine if trend is up or down
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const isPositive = lastValue >= firstValue;

  const strokeColor = color || (isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))");

  return (
    <div className={cn("h-8 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {showGradient && (
            <defs>
              <linearGradient id={`sparkGradient-${isPositive}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
