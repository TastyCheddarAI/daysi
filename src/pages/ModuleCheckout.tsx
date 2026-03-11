import { Link, useParams } from "react-router-dom";
import { ArrowLeft, GraduationCap, ShieldAlert } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDaysiEducationCatalog,
  useDaysiEducationEnrollments,
  useDaysiEducationEntitlements,
} from "@/hooks/useDaysiLearning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

export default function ModuleCheckout() {
  const { moduleSlug } = useParams();
  const { user, session } = useAuth();
  const offersQuery = useDaysiEducationCatalog();
  const entitlementsQuery = useDaysiEducationEntitlements(session?.access_token);
  const enrollmentsQuery = useDaysiEducationEnrollments(session?.access_token);

  const offer = (offersQuery.data ?? []).find((entry) => entry.slug === moduleSlug);
  const hasAccess =
    !!(entitlementsQuery.data ?? []).find(
      (entry) => entry.educationOfferSlug === moduleSlug && entry.status === "active",
    ) ||
    !!(enrollmentsQuery.data ?? []).find(
      (entry) => entry.enrollment.educationOfferSlug === moduleSlug,
    );

  if (
    offersQuery.isLoading ||
    (!!session?.access_token &&
      (entitlementsQuery.isLoading || enrollmentsQuery.isLoading))
  ) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </Layout>
    );
  }

  if (!offer) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Education offer not found</h1>
          <Button asChild variant="outline">
            <Link to="/success-system">Back to education</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={`Access ${offer.title} | Daysi Education`}
        description={`Access path for ${offer.title} on the new Daysi education platform.`}
        keywords="Daysi education access, education checkout"
      />

      <div className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-xl space-y-6">
          <Link
            to={`/success-system/${offer.slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to offer
          </Link>

          <Card className="rounded-3xl">
            <CardHeader className="space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/50">
                <GraduationCap className="h-8 w-8 text-primary/70" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Daysi Education</Badge>
                  <Badge variant="secondary">
                    {offer.price.isFree
                      ? "Free"
                      : formatMoney(offer.price.amountCents, offer.price.currency)}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{offer.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      The legacy Square education checkout has been retired. Paid education web
                      checkout is being rebuilt on the Daysi internal commerce path.
                    </p>
                    <p>
                      Access already works once entitlement exists through purchase, education
                      membership, or admin grant.
                    </p>
                  </div>
                </div>
              </div>

              {hasAccess ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
                  Your account already has access to this offer. Return to the offer page and open
                  the curriculum.
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link to={`/success-system/${offer.slug}`}>
                    {hasAccess ? "Open Curriculum" : "Return to Offer"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link
                    to={
                      user
                        ? "/dashboard"
                        : `/auth?redirect=${encodeURIComponent(`/success-system/${offer.slug}`)}`
                    }
                  >
                    {user ? "Open My Account" : "Sign In"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
