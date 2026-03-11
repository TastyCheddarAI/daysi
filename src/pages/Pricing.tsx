import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Package2, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { FeaturedPackages } from "@/components/pricing";
import { PageLoader } from "@/components/ui/loading-states";
import {
  useDaysiPublicProducts,
} from "@/hooks/useDaysiPublicBooking";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

const Pricing = () => {
  const { data: retailProducts, isLoading: isLoadingProducts } = useDaysiPublicProducts(
    DAYSI_DEFAULT_LOCATION_SLUG,
  );

  if (isLoadingProducts) {
    return (
      <Layout>
        <PageLoader message="Loading Daysi pricing..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Pricing & Packages | Daysi"
        description="Explore Daysi treatment packages, retail add-ons, and direct paths into the new internal booking flow."
        keywords="Daysi pricing, laser treatment packages, skin treatment pricing, clinic retail products"
        canonical="/pricing"
      />
      {/* Hero */}
      <section className="pt-32 pb-16 bg-secondary/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Investment in Your Glow
            </span>
            <h1 className="font-serif text-5xl md:text-6xl font-semibold mt-3 mb-6">
              Pricing & Packages
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Public pricing now runs on the internal Daysi catalog. Browse prepaid
              treatment packages, compare retail add-ons, and move into the new
              booking flow without the old commerce stack.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-24">
        <div className="container">
          <FeaturedPackages />
          
          {/* View all packages link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground mb-4">
              Looking for something specific?
            </p>
            <Button variant="outline" asChild>
              <Link to="/services">
                View All Services & Pricing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Retail Products */}
      <section id="retail-products" className="py-24 bg-secondary/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Package2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-serif text-4xl md:text-5xl font-semibold mb-6">
              Retail Add-Ons
            </h2>
            <p className="text-muted-foreground text-lg">
              Daysi retail products live in the same internal catalog as services and
              education. No more gift-card detour into Square.
            </p>
          </motion.div>

          {retailProducts && retailProducts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {retailProducts.map((product, index) => (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-3xl border border-border/60 bg-background p-8 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <h3 className="font-serif text-2xl font-semibold">{product.name}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {product.shortDescription}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-semibold">
                        ${(product.price.amountCents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        CAD
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto rounded-3xl border border-dashed border-border/70 bg-background/70 px-6 py-12 text-center">
              <p className="text-muted-foreground">
                Retail products are being republished into the Daysi catalog for this
                location.
              </p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground text-sm mb-4">
              Need a tailored plan or package recommendation?
            </p>
            <Button variant="outline" asChild>
              <Link to="/contact">
                Talk to Daysi
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="font-serif text-4xl font-semibold mb-6">
              Have Questions?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              The advisor and contact flow are live on Daysi. Use them to sort out
              memberships, package fit, and treatment sequencing without falling back
              to legacy checkout paths.
            </p>
            <Button variant="outline" size="lg" asChild>
              <Link to="/advisor">
                Open the Advisor
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Pricing;
