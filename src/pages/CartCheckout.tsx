import { ArrowRight, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

export default function CartCheckout() {
  return (
    <Layout>
      <SEO
        title="Cart Checkout Updated | Daysi"
        description="Legacy cart checkout has been retired while Daysi replaces the old provider-bound cart flow."
        keywords="Daysi cart checkout, clinic commerce, service pricing"
      />
      <section className="container py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border/70 bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            Cart checkout is being rebuilt on Daysi
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            The old cart flow depended on Supabase state plus Square checkout. That
            route is now blocked while the internal Daysi commerce path replaces it.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/services">
                Browse Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">View Packages</Link>
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
