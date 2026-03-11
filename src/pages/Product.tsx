import { ArrowRight, PackageSearch } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

export default function Product() {
  const { id } = useParams<{ id: string }>();

  return (
    <Layout>
      <SEO
        title="Package Catalog Updated | Daysi"
        description="Legacy package detail pages have been retired while Daysi moves package commerce onto the internal platform."
        keywords="Daysi packages, treatment packages, clinic pricing"
      />
      <section className="container py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border/70 bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PackageSearch className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            This package page has moved
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            The old product detail route depended on the legacy package table and
            Square checkout path. Daysi now publishes package pricing from the new
            internal catalog instead.
          </p>
          {id ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Requested legacy product id: <span className="font-mono">{id}</span>
            </p>
          ) : null}
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/pricing">
                View Live Package Pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/services">Browse Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
