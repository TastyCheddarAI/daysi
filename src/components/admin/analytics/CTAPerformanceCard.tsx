import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MousePointerClick, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface CTAData {
  ctaName: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

interface CTAPerformanceCardProps {
  ctaData: CTAData[];
}

export function CTAPerformanceCard({ ctaData }: CTAPerformanceCardProps) {
  if (!ctaData || ctaData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5" />
            CTA Performance
          </CardTitle>
          <CardDescription>Track button click engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MousePointerClick className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No CTA click data yet.</p>
            <p className="text-xs mt-1">Clicks will appear here once tracked.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalClicks = ctaData.reduce((sum, cta) => sum + cta.clicks, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MousePointerClick className="h-5 w-5" />
          CTA Performance
        </CardTitle>
        <CardDescription>
          {totalClicks.toLocaleString()} total clicks tracked
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ctaData.slice(0, 6).map((cta, index) => (
          <motion.div
            key={cta.ctaName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{cta.ctaName}</p>
                <p className="text-xs text-muted-foreground">
                  {cta.clicks.toLocaleString()} clicks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cta.conversions > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {cta.conversionRate.toFixed(1)}%
                </Badge>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
