import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, Chrome, Compass, Monitor } from "lucide-react";
import { motion } from "framer-motion";

interface BrowserData {
  name: string;
  count: number;
  percentage: number;
}

interface BrowserBreakdownChartProps {
  browsers: BrowserData[];
}

const browserConfig: Record<string, { icon: React.ElementType; color: string }> = {
  chrome: { icon: Chrome, color: "bg-primary" },
  safari: { icon: Compass, color: "bg-blue-500" },
  firefox: { icon: Globe, color: "bg-orange-500" },
  edge: { icon: Monitor, color: "bg-emerald-500" },
  other: { icon: Globe, color: "bg-muted-foreground" },
};

export function BrowserBreakdownChart({ browsers }: BrowserBreakdownChartProps) {
  if (!browsers || browsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Browser Distribution
          </CardTitle>
          <CardDescription>Visitor browsers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No browser data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...browsers.map(b => b.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Browser Distribution
        </CardTitle>
        <CardDescription>How visitors access your site</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {browsers.map((browser, index) => {
          const config = browserConfig[browser.name.toLowerCase()] || browserConfig.other;
          const Icon = config.icon;
          
          return (
            <motion.div
              key={browser.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium capitalize">{browser.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {browser.count.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium">
                    {browser.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(browser.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`h-full rounded-full ${config.color}`}
                />
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
