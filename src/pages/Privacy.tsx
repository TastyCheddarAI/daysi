import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";

export default function Privacy() {
  return (
    <Layout>
      <SEO 
        title="Privacy Policy" 
        description="Learn about how we collect, use, and protect your personal information." 
        keywords="privacy policy, data protection, personal information" 
      />
      <div className="container py-16 max-w-3xl">
        <h1 className="text-3xl font-serif font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, 
              make a booking, or contact us. This may include your name, email address, phone number, 
              and payment information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, 
              process transactions, send appointment reminders, and communicate with you about 
              promotions and updates.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Information Sharing</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share 
              your information with service providers who assist us in operating our business, 
              such as payment processors.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through 
              our contact page or email us directly.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
