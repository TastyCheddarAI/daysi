import { Link } from "react-router-dom";
import { Award, ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDaysiEducationCatalog,
  useDaysiEducationCertificates,
  useDaysiEducationEnrollments,
  useDaysiEducationEntitlements,
} from "@/hooks/useDaysiLearning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import type {
  DaysiLearningCertificate,
  DaysiLearningEnrollmentView,
  DaysiLearningEntitlement,
  DaysiPublicEducationOffer,
} from "@/lib/daysi-learning-api";

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

const entitlementSourceLabel: Record<DaysiLearningEntitlement["source"], string> = {
  purchase: "Purchased",
  membership: "Education Membership",
  admin_grant: "Staff Grant",
};

function EducationOfferCard(props: {
  offer: DaysiPublicEducationOffer;
  enrollment?: DaysiLearningEnrollmentView;
  entitlement?: DaysiLearningEntitlement;
  certificate?: DaysiLearningCertificate;
}) {
  const { offer, enrollment, entitlement, certificate } = props;
  const progress = enrollment?.summary.percentComplete ?? 0;
  const modulesComplete = enrollment?.summary.completedModules ?? 0;
  const modulesTotal = enrollment?.summary.totalModules ?? offer.moduleSlugs.length;

  return (
    <Link
      to={`/success-system/${offer.slug}`}
      className="group block overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-secondary/30 to-background px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {certificate ? (
                <Badge className="bg-emerald-600 text-white">Certified</Badge>
              ) : enrollment ? (
                <Badge className="bg-primary text-primary-foreground">Enrolled</Badge>
              ) : entitlement ? (
                <Badge variant="secondary">{entitlementSourceLabel[entitlement.source]}</Badge>
              ) : null}
              {offer.membershipEligible ? (
                <Badge variant="outline">Membership Eligible</Badge>
              ) : null}
            </div>
            <h3 className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
              {offer.title}
            </h3>
          </div>
          <Badge variant="outline" className="shrink-0">
            {offer.price.isFree
              ? "Free"
              : formatMoney(offer.price.amountCents, offer.price.currency)}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <p className="text-sm leading-6 text-muted-foreground">{offer.shortDescription}</p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>
            {offer.moduleSlugs.length} module{offer.moduleSlugs.length === 1 ? "" : "s"}
          </span>
        </div>

        {enrollment ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {modulesComplete} of {modulesTotal} complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-1 text-sm font-medium text-foreground">
          <span>
            {enrollment ? "Continue learning" : entitlement ? "Open curriculum" : "View details"}
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

export default function SuccessSystem() {
  const { session, user } = useAuth();
  const offersQuery = useDaysiEducationCatalog();
  const entitlementsQuery = useDaysiEducationEntitlements(session?.access_token);
  const enrollmentsQuery = useDaysiEducationEnrollments(session?.access_token);
  const certificatesQuery = useDaysiEducationCertificates(session?.access_token);

  const offers = offersQuery.data ?? [];
  const entitlements = entitlementsQuery.data ?? [];
  const enrollments = enrollmentsQuery.data ?? [];
  const certificates = certificatesQuery.data ?? [];

  const enrollmentByOfferSlug = new Map(
    enrollments.map((entry) => [entry.enrollment.educationOfferSlug, entry]),
  );
  const entitlementByOfferSlug = new Map(
    entitlements
      .filter((entry) => entry.status === "active")
      .map((entry) => [entry.educationOfferSlug, entry]),
  );
  const certificateByOfferSlug = new Map(
    certificates.map((entry) => [entry.educationOfferSlug, entry]),
  );

  const continueLearningOffers = offers.filter((offer) =>
    enrollmentByOfferSlug.has(offer.slug),
  );
  const availableOffers = offers.filter((offer) => !enrollmentByOfferSlug.has(offer.slug));

  return (
    <Layout>
      <SEO
        title="Daysi Education"
        description="Industry education, proprietary method training, and entitlement-based learning powered by the new Daysi platform."
        keywords="Daysi education, laser education, skin clinic education, proprietary method training"
      />

      <div className="min-h-screen bg-background">
        <section className="relative overflow-hidden px-4 py-14 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_45%),linear-gradient(to_bottom,_hsl(var(--secondary)/0.35),_transparent)]" />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-8">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Paid-access education on the Daysi platform
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Professional education built as a real product line.
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Daysi education is now running on the internal catalog, entitlement, enrollment,
                and certificate model. Customers do not need memberships to book services, and
                education access only opens when an offer has been purchased, granted, or included
                through an education membership.
              </p>
            </div>

            {user ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-border bg-card/70 px-5 py-4">
                  <div className="text-sm text-muted-foreground">Active enrollments</div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">
                    {enrollments.length}
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-card/70 px-5 py-4">
                  <div className="text-sm text-muted-foreground">Active entitlements</div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">
                    {entitlements.filter((entry) => entry.status === "active").length}
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-card/70 px-5 py-4">
                  <div className="text-sm text-muted-foreground">Certificates earned</div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">
                    {certificates.length}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/auth?redirect=%2Fsuccess-system">Sign in to access education</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/pricing">View pricing</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-12 px-4 pb-20">
          {user && continueLearningOffers.length > 0 ? (
            <section className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Continue learning</h2>
                  <p className="text-sm text-muted-foreground">
                    Resume active Daysi education offers and module progress.
                  </p>
                </div>
                {certificates.length > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
                    <Award className="h-4 w-4" />
                    {certificates.length} certificate{certificates.length === 1 ? "" : "s"} issued
                  </div>
                ) : null}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {continueLearningOffers.map((offer) => (
                  <EducationOfferCard
                    key={offer.id}
                    offer={offer}
                    enrollment={enrollmentByOfferSlug.get(offer.slug)}
                    entitlement={entitlementByOfferSlug.get(offer.slug)}
                    certificate={certificateByOfferSlug.get(offer.slug)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                {continueLearningOffers.length > 0
                  ? "Explore more education"
                  : "Available education"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Published offers can be sold directly, unlocked by education memberships, or
                granted internally by admin for staff training.
              </p>
            </div>

            {offersQuery.isLoading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {[1, 2].map((entry) => (
                  <div key={entry} className="overflow-hidden rounded-3xl border border-border bg-card">
                    <Skeleton className="h-28 w-full" />
                    <div className="space-y-4 p-6">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : availableOffers.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {availableOffers.map((offer) => (
                  <EducationOfferCard
                    key={offer.id}
                    offer={offer}
                    entitlement={entitlementByOfferSlug.get(offer.slug)}
                  />
                ))}
              </div>
            ) : offers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  No education offers are live yet.
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Admin can publish offers when the location is ready to sell or grant access.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </Layout>
  );
}
