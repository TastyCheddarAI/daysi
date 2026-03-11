import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDaysiEducationCatalog,
  useDaysiEducationEnrollments,
  useUpdateDaysiEducationProgress,
} from "@/hooks/useDaysiLearning";
import { formatDaysiEducationModuleLabel } from "@/lib/daysi-learning-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function LessonView() {
  const { moduleSlug, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, loading: authLoading } = useAuth();
  const offersQuery = useDaysiEducationCatalog();
  const enrollmentsQuery = useDaysiEducationEnrollments(session?.access_token);
  const updateProgress = useUpdateDaysiEducationProgress(session?.access_token);

  const offer = (offersQuery.data ?? []).find((entry) => entry.slug === moduleSlug);
  const enrollment = (enrollmentsQuery.data ?? []).find(
    (entry) => entry.enrollment.educationOfferSlug === moduleSlug,
  );
  const progressRecord = enrollment?.lessonProgress.find(
    (entry) => entry.moduleSlug === lessonId,
  );

  const moduleSlugValue = lessonId ?? "";
  const moduleIndex =
    offer?.moduleSlugs.findIndex((entry) => entry === moduleSlugValue) ?? -1;
  const isValidModule = moduleIndex >= 0;
  const percentComplete = progressRecord?.percentComplete ?? 0;
  const status = progressRecord?.status ?? "not_started";

  const handleProgressUpdate = async (input: {
    status: "not_started" | "in_progress" | "completed";
    percentComplete?: number;
    successMessage: string;
  }) => {
    if (!enrollment || !lessonId) {
      return;
    }

    try {
      await updateProgress.mutateAsync({
        lessonId,
        enrollmentId: enrollment.enrollment.id,
        status: input.status,
        percentComplete: input.percentComplete,
      });
      toast.success(input.successMessage);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Progress could not be updated.",
      );
    }
  };

  if (!authLoading && !user) {
    navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
    return null;
  }

  if (
    authLoading ||
    offersQuery.isLoading ||
    (!!session?.access_token && enrollmentsQuery.isLoading)
  ) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="flex-1 space-y-4 px-4 py-6">
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-56 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!offer || !isValidModule) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Module not found</h1>
          <Button asChild variant="outline">
            <Link to={`/success-system/${moduleSlug}`}>Back to education offer</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Access required</h1>
          <p className="text-muted-foreground">
            This module lives inside the Daysi enrollment flow. Open the offer first so Daysi can
            verify entitlement and create your enrollment record.
          </p>
          <Button asChild>
            <Link to={`/success-system/${offer.slug}`}>Return to offer</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${formatDaysiEducationModuleLabel(moduleSlugValue)} | ${offer.title}`}
        description={`Module progress for ${formatDaysiEducationModuleLabel(moduleSlugValue)} in ${offer.title}.`}
        keywords="Daysi education module, progress tracking"
      />

      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card px-4 py-4">
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <Link
              to={`/success-system/${offer.slug}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted-foreground">{offer.title}</div>
              <h1 className="truncate text-lg font-semibold text-foreground">
                {formatDaysiEducationModuleLabel(moduleSlugValue)}
              </h1>
            </div>
            <Badge
              variant={status === "completed" ? "default" : "outline"}
              className="capitalize"
            >
              {status.replace(/_/g, " ")}
            </Badge>
          </div>
        </header>

        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <main className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Module {moduleIndex + 1} of {offer.moduleSlugs.length}
                    </div>
                    <h2 className="mt-1 text-2xl font-semibold text-foreground">
                      {formatDaysiEducationModuleLabel(moduleSlugValue)}
                    </h2>
                  </div>
                  {enrollment.certificate ? (
                    <Badge className="bg-emerald-600 text-white">Certificate earned</Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{percentComplete}%</span>
                  </div>
                  <Progress value={percentComplete} className="h-2" />
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Interactive tutoring for this curriculum is being rebuilt on the internal Daysi
                  AI engine. Progress tracking, certificates, and enrollment control are already
                  live on the new platform.
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      handleProgressUpdate({
                        status: "in_progress",
                        percentComplete: Math.max(percentComplete, 50),
                        successMessage: "Module progress updated.",
                      })
                    }
                    disabled={updateProgress.isPending}
                  >
                    {updateProgress.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {status === "not_started" ? "Start module" : "Continue module"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleProgressUpdate({
                        status: "completed",
                        percentComplete: 100,
                        successMessage: "Module marked complete.",
                      })
                    }
                    disabled={updateProgress.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark complete
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      handleProgressUpdate({
                        status: "not_started",
                        percentComplete: 0,
                        successMessage: "Module progress reset.",
                      })
                    }
                    disabled={updateProgress.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </main>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Curriculum
              </h2>
              <div className="mt-4 space-y-2">
                {offer.moduleSlugs.map((entry, index) => {
                  const moduleProgress = enrollment.lessonProgress.find(
                    (progressEntry) => progressEntry.moduleSlug === entry,
                  );
                  const isActive = entry === moduleSlugValue;

                  return (
                    <Link
                      key={entry}
                      to={`/success-system/${offer.slug}/${entry}`}
                      className={`block rounded-2xl border px-4 py-3 transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Module {index + 1}</div>
                          <div className="truncate font-medium text-foreground">
                            {formatDaysiEducationModuleLabel(entry)}
                          </div>
                        </div>
                        <Badge
                          variant={
                            moduleProgress?.status === "completed" ? "default" : "outline"
                          }
                          className="capitalize"
                        >
                          {(moduleProgress?.status ?? "not_started").replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
