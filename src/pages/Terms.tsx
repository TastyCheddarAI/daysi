import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";

export default function Terms() {
  return (
    <Layout>
      <SEO 
        title="Terms of Service" 
        description="Read our terms of service and conditions for using our services." 
        keywords="terms of service, conditions, legal" 
      />
      <div className="container py-16 max-w-3xl">
        <h1 className="text-3xl font-serif font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-neutral max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Acceptance of Terms</h2>
            <p>
              By accessing and using our services, you accept and agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Booking & Appointments</h2>
            <p>
              Appointments are subject to availability. We require at least 24 hours notice for 
              cancellations or rescheduling. Late cancellations or no-shows may be subject to a fee.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Packages & Credits</h2>
            <p>
              Treatment packages and store credits are non-refundable and non-transferable. 
              Packages must be used within 12 months of purchase unless otherwise specified.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Referral Program</h2>
            <p>
              Referral discounts apply to first-time customers only. Credits are awarded after 
              the referred customer completes their first paid treatment. We reserve the right 
              to modify or terminate the referral program at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Limitation of Liability</h2>
            <p>
              We strive to provide the best possible service but cannot guarantee specific results. 
              Individual outcomes may vary based on skin type and other factors.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Changes to Terms</h2>
            <p>
              We reserve the right to update these terms at any time. Continued use of our 
              services after changes constitutes acceptance of the new terms.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
