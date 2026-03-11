import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { TreatmentPreview } from "@/components/home/TreatmentPreview";
import { ServicesSection } from "@/components/home/ServicesSection";
import { BeforeAfterSection } from "@/components/home/BeforeAfterSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { SEO } from "@/components/SEO";

const Index = () => {
  return (
    <Layout>
      <SEO
        title="Laser Hair Removal Niverville MB | Prairie Glow Beauty - Painless & Affordable"
        description="Discover painless laser hair removal in Niverville, MB. Book online, shop products, earn referral credits at Prairie Glow. Safe for all skin tones."
        keywords="laser hair removal niverville mb, affordable laser hair removal winnipeg outskirts, painless laser hair removal niverville"
        canonical="/"
      />
      <HeroSection />
      <TreatmentPreview />
      <ServicesSection />
      <BeforeAfterSection />
      <TestimonialsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
