import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Globe, Search, Share2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
}

interface TrafficSourcesProps {
  sources: TrafficSource[];
}

const sourceConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  direct: { icon: Globe, color: "bg-blue-500", label: "Direct" },
  google: { icon: Search, color: "bg-emerald-500", label: "Search Engines" },
  social: { icon: Share2, color: "bg-purple-500", label: "Social Media" },
  referral: { icon: Link2, color: "bg-amber-500", label: "Referral" },
};

export function TrafficSources({ sources }: TrafficSourcesProps) {
  const maxVisitors = Math.max(...sources.map(s => s.visitors), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
        <CardDescription>Where your visitors are coming from</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.map((source, index) => {
            const config = sourceConfig[source.source] || sourceConfig.referral;
            const Icon = config.icon;
            const barWidth = (source.visitors / maxVisitors) * 100;

            return (
              <motion.div
                key={source.source}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.color)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{source.visitors.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {source.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", config.color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  />
                </div>
              </motion.div>
            );
          })}

          {sources.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No traffic source data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
