import { ArrowRight, ShieldAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const requestedProduct = searchParams.get("product");

  return (
    <Layout>
      <SEO
        title="Checkout Updated | Daysi"
        description="Legacy package checkout has been retired while Daysi finishes the internal commerce cutover."
        keywords="Daysi checkout, package pricing, clinic commerce"
      />
      <section className="container py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border/70 bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            Legacy checkout is offline
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            This route used the old provider-bound checkout flow. Daysi has retired that
            path while package and retail purchasing move fully onto the internal
            commerce engine.
          </p>
          {requestedProduct ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Requested legacy product: <span className="font-mono">{requestedProduct}</span>
            </p>
          ) : null}
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/pricing">
                View Current Packages
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/services">Browse Services</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/contact">Talk to Daysi</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
