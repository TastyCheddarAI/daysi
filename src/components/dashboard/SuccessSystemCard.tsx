import { Link } from "react-router-dom";
import { ArrowRight, Award, GraduationCap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-states";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDaysiEducationCertificates,
  useDaysiEducationEnrollments,
} from "@/hooks/useDaysiLearning";

export function SuccessSystemCard() {
  const { user, session } = useAuth();
  const enrollmentsQuery = useDaysiEducationEnrollments(session?.access_token);
  const certificatesQuery = useDaysiEducationCertificates(session?.access_token);

  const enrollments = enrollmentsQuery.data ?? [];
  const certificates = certificatesQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Daysi Education
        </CardTitle>
        <CardDescription>Industry education and proprietary method access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user && certificates.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <Award className="h-4 w-4" />
            <span>
              {certificates.length} certificate{certificates.length === 1 ? "" : "s"} issued
            </span>
          </div>
        ) : null}

        {enrollmentsQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((entry) => (
              <div key={entry} className="space-y-2 rounded-2xl border border-border bg-card p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No education enrollments yet"
            description="Published Daysi education offers appear here once access has been purchased, granted, or unlocked by membership."
            action={{
              label: "Browse Education",
              onClick: () => {
                window.location.href = "/success-system";
              },
            }}
          />
        ) : (
          <div className="space-y-3">
            {enrollments.slice(0, 3).map((entry) => (
              <div
                key={entry.enrollment.id}
                className="space-y-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {entry.enrollment.educationOfferTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.summary.completedModules} of {entry.summary.totalModules} modules complete
                    </div>
                  </div>
                  {entry.certificate ? (
                    <Badge className="bg-emerald-600 text-white">Certified</Badge>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {entry.enrollment.completedAt ? "Completed" : "Active"}
                    </Badge>
                  )}
                </div>

                <Progress value={entry.summary.percentComplete} className="h-1.5" />

                <Button asChild variant="outline" size="sm">
                  <Link to={`/success-system/${entry.enrollment.educationOfferSlug}`}>
                    Open Education
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
