import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import {
  useClaimFreeDaysiEducationOffer,
  useCreateDaysiEducationEnrollment,
  useDaysiEducationCatalog,
  useDaysiEducationEnrollments,
  useDaysiEducationEntitlements,
} from "@/hooks/useDaysiLearning";
import {
  formatDaysiEducationModuleLabel,
  type DaysiLearningEntitlement,
} from "@/lib/daysi-learning-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

const entitlementSourceLabel: Record<DaysiLearningEntitlement["source"], string> = {
  purchase: "Purchased",
  membership: "Unlocked by Membership",
  admin_grant: "Granted by Admin",
};

export default function ModuleDetail() {
  const { moduleSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, loading: authLoading } = useAuth();
  const offersQuery = useDaysiEducationCatalog();
  const entitlementsQuery = useDaysiEducationEntitlements(session?.access_token);
  const enrollmentsQuery = useDaysiEducationEnrollments(session?.access_token);
  const createEnrollment = useCreateDaysiEducationEnrollment(session?.access_token);
  const claimFreeOffer = useClaimFreeDaysiEducationOffer(session?.access_token);

  const offer = (offersQuery.data ?? []).find((entry) => entry.slug === moduleSlug);
  const entitlement = (entitlementsQuery.data ?? []).find(
    (entry) => entry.educationOfferSlug === moduleSlug && entry.status === "active",
  );
  const enrollment = (enrollmentsQuery.data ?? []).find(
    (entry) => entry.enrollment.educationOfferSlug === moduleSlug,
  );

  const progressByModuleSlug = new Map(
    (enrollment?.lessonProgress ?? []).map((entry) => [entry.moduleSlug, entry]),
  );
  const nextModuleSlug =
    offer?.moduleSlugs.find(
      (entry) => progressByModuleSlug.get(entry)?.status !== "completed",
    ) ?? offer?.moduleSlugs[0];

  const handleAccess = async () => {
    if (!offer) {
      return;
    }

    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (!session?.access_token) {
      toast.error(
        "Your Daysi session needs to be refreshed before education access can continue.",
      );
      return;
    }

    if (enrollment) {
      navigate(
        nextModuleSlug
          ? `/success-system/${offer.slug}/${nextModuleSlug}`
          : `/success-system/${offer.slug}`,
      );
      return;
    }

    try {
      if (!entitlement) {
        if (offer.price.isFree) {
          await claimFreeOffer.mutateAsync({
            locationSlug: offer.locationSlug,
            offer,
            user,
          });
        } else {
          navigate(`/success-system/${offer.slug}/checkout`);
          return;
        }
      }

      const nextEnrollment = await createEnrollment.mutateAsync({
        locationSlug: offer.locationSlug,
        offerSlug: offer.slug,
      });

      toast.success("Education access is ready.");
      navigate(
        nextEnrollment.enrollment.moduleSlugs[0]
          ? `/success-system/${offer.slug}/${nextEnrollment.enrollment.moduleSlugs[0]}`
          : `/success-system/${offer.slug}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Education access could not be opened.",
      );
    }
  };

  const isLoading =
    offersQuery.isLoading ||
    (!!session?.access_token &&
      (entitlementsQuery.isLoading || enrollmentsQuery.isLoading));
  const isMutating = createEnrollment.isPending || claimFreeOffer.isPending;

  if (isLoading || authLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      </Layout>
    );
  }

  if (!offer) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Education offer not found</h1>
          <p className="text-muted-foreground">
            This route now resolves against the Daysi education catalog, and this offer is not
            published there.
          </p>
          <Button asChild variant="outline">
            <Link to="/success-system">Back to education</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const actionLabel = enrollment
    ? nextModuleSlug
      ? "Continue modules"
      : "Review curriculum"
    : entitlement
      ? "Open curriculum"
      : offer.price.isFree
        ? "Claim free access"
        : `Purchase access for ${formatMoney(offer.price.amountCents, offer.price.currency)}`;

  return (
    <Layout>
      <SEO
        title={`${offer.title} | Daysi Education`}
        description={offer.shortDescription}
        keywords="Daysi education, laser education, clinic training"
      />

      <div className="min-h-screen bg-background">
        <div className="bg-[linear-gradient(to_bottom,_hsl(var(--secondary)/0.35),_transparent)] px-4 py-10 md:py-14">
          <div className="mx-auto max-w-5xl space-y-6">
            <Link
              to="/success-system"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to education
            </Link>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Education Offer</Badge>
                  {offer.membershipEligible ? (
                    <Badge variant="secondary">Membership eligible</Badge>
                  ) : null}
                  {entitlement ? (
                    <Badge className="bg-primary text-primary-foreground">
                      {entitlementSourceLabel[entitlement.source]}
                    </Badge>
                  ) : null}
                  {enrollment?.certificate ? (
                    <Badge className="bg-emerald-600 text-white">Certificate issued</Badge>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {offer.title}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                    {offer.shortDescription}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {offer.moduleSlugs.length} module{offer.moduleSlugs.length === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {offer.price.isFree
                      ? "Free access"
                      : formatMoney(offer.price.amountCents, offer.price.currency)}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-5">
                  {enrollment ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span>{enrollment.summary.percentComplete}%</span>
                      </div>
                      <Progress value={enrollment.summary.percentComplete} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {enrollment.summary.completedModules} of {enrollment.summary.totalModules}{" "}
                        modules complete.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Access model</div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Education is entitlement-based. Purchase, education membership, or admin
                        grant must exist before modules can be opened.
                      </p>
                    </div>
                  )}

                  {!entitlement && !offer.price.isFree ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                      Web checkout for paid education offers is being rebuilt on the Daysi path.
                      The old Square checkout has been retired.
                    </div>
                  ) : null}

                  <Button
                    onClick={handleAccess}
                    disabled={isMutating}
                    size="lg"
                    className="w-full gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {actionLabel}
                  </Button>

                  {!user ? (
                    <p className="text-xs text-muted-foreground">
                      Sign in first, then Daysi can check whether you already have access through
                      purchase, membership, or admin grant.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:py-14">
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Included modules</h2>
                <p className="text-sm text-muted-foreground">
                  The new Daysi education engine tracks progress at the module level.
                </p>
              </div>
              {enrollment?.certificate ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
                  <Award className="h-4 w-4" />
                  Certificate earned
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {offer.moduleSlugs.map((entry, index) => {
                const progress = progressByModuleSlug.get(entry);
                const isComplete = progress?.status === "completed";
                const isInProgress = progress?.status === "in_progress";
                const canAccess = !!enrollment;

                const content = (
                  <>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isComplete
                          ? "bg-emerald-100 text-emerald-700"
                          : isInProgress
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium text-foreground">
                        {formatDaysiEducationModuleLabel(entry)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {progress?.status === "completed"
                            ? "Completed"
                            : progress?.status === "in_progress"
                              ? `${progress.percentComplete}% complete`
                              : "Not started"}
                        </span>
                        {progress?.updatedAt ? (
                          <span>
                            Updated {new Date(progress.updatedAt).toLocaleDateString("en-CA")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {!canAccess ? (
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : null}
                  </>
                );

                return canAccess ? (
                  <Link
                    key={entry}
                    to={`/success-system/${offer.slug}/${entry}`}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:bg-accent/30"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={entry}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 px-4 py-4 opacity-80"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
