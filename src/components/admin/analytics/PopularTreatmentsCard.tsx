import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Eye, CalendarCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface TreatmentData {
  name: string;
  views: number;
  bookings: number;
  conversionRate: number;
}

interface PopularTreatmentsCardProps {
  treatments: TreatmentData[];
}

export function PopularTreatmentsCard({ treatments }: PopularTreatmentsCardProps) {
  if (!treatments || treatments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Popular Treatments
          </CardTitle>
          <CardDescription>Treatment page views and interest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No treatment data yet.</p>
            <p className="text-xs mt-1">Views on service pages will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxViews = Math.max(...treatments.map(t => t.views));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Popular Treatments
        </CardTitle>
        <CardDescription>Service page performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {treatments.slice(0, 5).map((treatment, index) => (
          <motion.div
            key={treatment.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium truncate max-w-[200px]">{treatment.name}</span>
              {treatment.conversionRate > 0 && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {treatment.conversionRate.toFixed(1)}% conv.
                </span>
              )}
            </div>
            <Progress value={(treatment.views / maxViews) * 100} className="h-2" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {treatment.views.toLocaleString()} views
              </span>
              {treatment.bookings > 0 && (
                <span className="flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3" />
                  {treatment.bookings} bookings
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
