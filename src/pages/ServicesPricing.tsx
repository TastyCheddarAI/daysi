import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, Clock3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading-states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDaysiBookableServices } from "@/hooks/useDaysiPublicBooking";
import {
  DAYSI_DEFAULT_LOCATION_SLUG,
  getDaysiCategoryLabel,
  type DaysiPublicService,
} from "@/lib/daysi-public-api";

function ServiceDiscoveryCard({
  service,
  index,
}: {
  service: DaysiPublicService;
  index: number;
}) {
  const memberPrice = service.price.memberAmountCents;
  const retailPrice = service.price.retailAmountCents;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="rounded-3xl border border-border/60 bg-card/90 shadow-sm overflow-hidden"
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="rounded-full">
              {getDaysiCategoryLabel(service.categorySlug)}
            </Badge>
            <h2 className="text-2xl font-serif font-semibold text-foreground">
              {service.name}
            </h2>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-semibold tracking-tight">
              ${(retailPrice / 100).toFixed(2)}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Retail
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          {service.shortDescription}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {service.durationMinutes} min
          </Badge>
          {memberPrice ? (
            <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 hover:bg-primary/10">
              Member ${(memberPrice / 100).toFixed(2)}
            </Badge>
          ) : null}
          {service.featureTags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="rounded-full capitalize">
              {tag.replace(/-/g, " ")}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-5">
          <div className="text-xs text-muted-foreground">
            Bookable through Daysi live availability.
          </div>
          <Button asChild className="rounded-full px-5">
            <Link to={`/booking?service=${service.slug}`}>
              Book This Service
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export default function ServicesPricing() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: services, isLoading } = useDaysiBookableServices(
    DAYSI_DEFAULT_LOCATION_SLUG,
  );

  const categories = useMemo(() => {
    const categoryCounts = new Map<string, number>();
    for (const service of services ?? []) {
      categoryCounts.set(
        service.categorySlug,
        (categoryCounts.get(service.categorySlug) ?? 0) + 1,
      );
    }

    return [...categoryCounts.entries()]
      .sort(([left], [right]) =>
        getDaysiCategoryLabel(left).localeCompare(getDaysiCategoryLabel(right)),
      )
      .map(([slug, count]) => ({
        slug,
        label: getDaysiCategoryLabel(slug),
        count,
      }));
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!services) {
      return [];
    }

    if (selectedCategory === "all") {
      return services;
    }

    return services.filter((service) => service.categorySlug === selectedCategory);
  }, [selectedCategory, services]);

  if (isLoading) {
    return (
      <Layout>
        <PageLoader message="Loading Daysi services..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Services & Pricing | Daysi"
        description="Browse Daysi treatments with live platform pricing, member rates, and direct booking into real availability."
        keywords="Daysi services, laser treatments, skin rejuvenation, treatment pricing"
      />

      <section className="pt-32 pb-12 bg-gradient-to-b from-secondary/40 via-background to-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 left-[8%] w-72 h-72 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 right-[10%] w-96 h-96 rounded-full bg-secondary blur-3xl opacity-70" />
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              Daysi Service Catalog
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-semibold tracking-tight">
              Services that route directly into the new Daysi booking engine
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-8 max-w-3xl mx-auto">
              This page now reads from the internal Daysi catalog instead of the legacy
              product table. Browse treatments, compare member pricing, and jump
              straight into live availability.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-border/60 bg-background/80 p-6 md:p-8"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  Non-members can still book at retail pricing.
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Memberships improve pricing and entitlements, but they are not required to
                  access the booking flow.
                </p>
              </div>

              <Tabs
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                className="w-full md:w-auto"
              >
                <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
                  <TabsTrigger
                    value="all"
                    className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    All Services
                    <span className="ml-1.5 text-xs opacity-70">({services?.length ?? 0})</span>
                  </TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category.slug}
                      value={category.slug}
                      className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {category.label}
                      <span className="ml-1.5 text-xs opacity-70">({category.count})</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </motion.div>

          {filteredServices.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {filteredServices.map((service, index) => (
                <ServiceDiscoveryCard key={service.id} service={service} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border/80 bg-muted/30 p-12 text-center">
              <p className="text-muted-foreground">
                No Daysi services are published in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
