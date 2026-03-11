import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ProblemSection } from "@/components/services/ProblemSection";
import { TechnologyShowcase } from "@/components/services/TechnologyShowcase";
import { TreatmentAreas } from "@/components/services/TreatmentAreas";
import { ExperienceTimeline } from "@/components/services/ExperienceTimeline";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { ServiceSchema } from "@/components/services/ServiceSchema";
import { ContentShowcase } from "@/components/services/ContentShowcase";
import { RelatedServices } from "@/components/services/RelatedServices";
import heroFace from "@/assets/hero-face-3.jpg";
import {
  Clock,
  Star,
  Shield,
  Zap,
  Sparkles,
  Calendar,
  CheckCircle,
  ThumbsUp,
  Sun,
  Droplets,
  Layers,
  Eye,
  Smile,
  CloudRain,
  RefreshCw,
  Award,
  FlaskConical,
  MapPin,
} from "lucide-react";

const trustBadges = [
  { icon: Sparkles, label: "Visible Results", sublabel: "First Session" },
  { icon: Clock, label: "No Downtime", sublabel: "Return Immediately" },
  { icon: Shield, label: "Customized", sublabel: "For Your Skin" },
];

const painPoints = [
  {
    icon: Sun,
    title: "Sun Damage & Dark Spots",
    description: "Years of sun exposure leaving behind uneven pigmentation, age spots, and a dull complexion that makeup can't hide.",
  },
  {
    icon: Layers,
    title: "Rough, Uneven Texture",
    description: "Bumpy skin, enlarged pores, and an overall lack of smoothness that makes your skin look aged and tired.",
  },
  {
    icon: CloudRain,
    title: "Dull, Lifeless Complexion",
    description: "That youthful glow has faded, replaced by sallow, tired-looking skin that doesn't reflect light the way it used to.",
  },
  {
    icon: Eye,
    title: "Visible Pores & Dull Texture",
    description: "Enlarged pores and rough texture that makes skin look tired and uneven, never achieving that smooth radiance you want.",
  },
];

const techSteps = [
  {
    number: "01",
    icon: Layers,
    title: "Cleanse & Prep",
    description: "Deep cleansing removes impurities while preparing your skin to receive maximum benefits from treatment.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Treat & Renew",
    description: "Customized treatments (peels, LED, microcurrent, or laser) target your specific concerns at the cellular level.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Nourish & Protect",
    description: "Potent serums, hydration, and protection seal in results and extend the benefits of your treatment.",
  },
];

const treatmentOptions = [
  { icon: Sparkles, name: "Glass Skin Facial", description: "Our signature treatment for that coveted dewy, translucent glow. Deep hydration meets gentle exfoliation.", duration: "75 min", sessions: "Monthly maintenance", popular: true },
  { icon: Layers, name: "Chemical Peels", description: "Medical-grade peels remove damaged layers, revealing fresh, even-toned skin beneath.", duration: "45-60 min", sessions: "Series of 3-6" },
  { icon: Zap, name: "LED Light Therapy", description: "Different wavelengths target acne, inflammation, and collagen production. Painless and relaxing.", duration: "20-30 min", sessions: "Weekly series" },
  { icon: Droplets, name: "Hydrating Infusions", description: "Deep moisture delivery using advanced techniques to plump and revitalize dehydrated skin.", duration: "60 min", sessions: "As needed", popular: true },
  { icon: Sun, name: "Pigmentation Treatment", description: "Targeted therapy for sun spots, melasma, and uneven skin tone using advanced light technology.", duration: "30-45 min", sessions: "Series of 4-6" },
  { icon: Eye, name: "Pore Refinement", description: "Deep extraction combined with pore-minimizing treatments for clearer, more refined skin.", duration: "60 min", sessions: "Monthly" },
];

const experienceSteps = [
  {
    icon: Calendar,
    title: "Skin Analysis",
    description: "We examine your skin under specialized lighting to identify concerns invisible to the naked eye. Every treatment plan starts here.",
    duration: "15 minutes",
  },
  {
    icon: Shield,
    title: "Custom Protocol",
    description: "Based on your analysis and goals, we design a personalized treatment combining the most effective modalities for your skin type.",
    duration: "Personalized",
  },
  {
    icon: Sparkles,
    title: "Luxurious Treatment",
    description: "Relax in our tranquil treatment room while we work our magic. Every session is designed to be as relaxing as it is effective.",
    duration: "45-90 min",
  },
  {
    icon: CheckCircle,
    title: "Immediate Glow",
    description: "Walk out with visibly improved skin. Most treatments require no downtime, perfect for lunch-break beauty.",
    duration: "Same day",
  },
  {
    icon: ThumbsUp,
    title: "Lasting Results",
    description: "With a customized home care routine and maintenance schedule, enjoy progressively better skin month after month.",
    duration: "Ongoing",
  },
];

const faqs = [
  {
    question: "What is skin rejuvenation and how does it work?",
    answer: "Skin rejuvenation encompasses a range of treatments designed to restore your skin's youthful appearance by addressing texture, tone, hydration, and overall radiance. These treatments work through various mechanisms. Chemical peels remove damaged surface cells, LED therapy stimulates cellular repair, and hydrating treatments restore moisture balance. The goal is to activate your skin's natural renewal processes while correcting visible concerns like dullness, uneven tone, and texture issues.",
  },
  {
    question: "Which skin rejuvenation treatment is right for me?",
    answer: "The best treatment depends on your primary concerns and skin type. Dullness and dehydration respond well to our Glass Skin Facial and hydrating infusions. Uneven tone and sun damage benefit from chemical peels and pigmentation treatments. Acne and inflammation improve with LED therapy. During your consultation, we'll analyze your skin and discuss your goals to recommend the most effective treatment protocol. Often a combination approach yields the best results.",
  },
  {
    question: "How long before I see results from skin rejuvenation?",
    answer: "Many clients notice immediate improvements: glowing skin, better hydration, and a more refined appearance right after treatment. However, the most significant and lasting changes occur over time. Chemical peels reveal their full effect as skin heals over 7-14 days. LED therapy and collagen-stimulating treatments show progressive improvement over 4-12 weeks. A series of treatments typically delivers the most dramatic transformation.",
  },
  {
    question: "Is there any downtime with skin rejuvenation treatments?",
    answer: "Most of our rejuvenation treatments require minimal to no downtime. Facials, LED therapy, and hydrating treatments let you return to normal activities immediately with a visible glow. Light chemical peels may cause mild peeling for 2-3 days. Medium-depth peels require 5-7 days of healing with visible flaking. We'll clearly explain any expected downtime before your treatment so you can plan accordingly.",
  },
  {
    question: "How often should I get skin rejuvenation treatments?",
    answer: "Frequency depends on the treatment type and your goals. Maintenance facials are ideal every 4-6 weeks, aligned with your skin's natural renewal cycle. LED therapy can be done weekly during an initial series, then monthly for maintenance. Chemical peels are typically spaced 2-4 weeks apart during a treatment series, then quarterly for maintenance. We'll create a personalized schedule based on your skin's needs and your lifestyle.",
  },
  {
    question: "Can skin rejuvenation help with acne and acne scars?",
    answer: "Absolutely! LED blue light therapy kills acne-causing bacteria and reduces inflammation for active breakouts. Chemical peels help unclog pores and improve texture. For acne scars, treatments like microneedling, deeper peels, and certain laser modalities can significantly improve scarring over a series of sessions. During your consultation, we'll assess your acne concerns and recommend the most effective approach.",
  },
  {
    question: "What should I do to prepare for a skin rejuvenation treatment?",
    answer: "Preparation varies by treatment, but general guidelines include: avoid retinoids and exfoliating products for 3-7 days before treatment, stay out of the sun and skip self-tanners for 2 weeks prior, come with clean skin free of makeup, and let us know about any medications or recent procedures. For chemical peels, additional preparation may be required. We'll provide detailed instructions at booking.",
  },
  {
    question: "Are skin rejuvenation treatments safe for sensitive skin?",
    answer: "Yes! We offer treatments suitable for all skin types, including sensitive and reactive skin. During your analysis, we identify any sensitivities and customize your treatment accordingly. Options like gentle enzyme peels, calming LED therapy, and hydrating treatments are excellent for sensitive skin. We always patch test if there's any concern and can adjust product formulations to minimize irritation risk.",
  },
  {
    question: "Can I combine multiple skin rejuvenation treatments?",
    answer: "Combination treatments are often the most effective approach! Our custom facial protocols frequently combine multiple modalities. For example, gentle exfoliation followed by LED therapy and a hydrating mask. For more intensive combination treatments, we'll space them appropriately to ensure your skin isn't overwhelmed. Many clients see their best results from strategic combination protocols tailored to their specific concerns.",
  },
  {
    question: "What's the difference between a regular facial and skin rejuvenation?",
    answer: "While basic facials focus on surface-level cleansing and relaxation, skin rejuvenation treatments work at a deeper level to create lasting change. Our rejuvenation protocols use medical-grade products and advanced technologies like LED, ultrasound, and clinical-strength peels that aren't available in standard spa facials. The result is measurable improvement in skin quality, not just a temporary glow that fades by the next day.",
  },
];

export default function SkinRejuvenation() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Skin Rejuvenation", href: "/services/skin-rejuvenation" },
  ];

  return (
    <Layout>
      <SEO
        title="Skin Rejuvenation Niverville MB | Facials, Peels & LED Therapy | Prairie Glow"
        description="Professional skin rejuvenation in Niverville, Manitoba. Glass skin facials, chemical peels, LED therapy. Visible results, no downtime. Book your skin analysis today."
        keywords="skin rejuvenation niverville, facial treatments manitoba, chemical peels winnipeg, LED light therapy, glass skin facial, skin texture treatment"
        canonical="/services/skin-rejuvenation"
      />
      <ServiceSchema
        serviceName="Skin Rejuvenation Treatments"
        description="Professional skin rejuvenation services including facials, chemical peels, LED therapy, and hydrating treatments for radiant, youthful skin."
        provider="Prairie Glow Beauty"
        areaServed="Niverville, Manitoba"
        url="https://laserhairremovalwinnipeg.ca/services/skin-rejuvenation"
        priceRange="$$"
      />
      
      <Breadcrumb items={breadcrumbItems} />
      
      <ServiceHero
        subtitle="Skin Rejuvenation"
        title="Reveal Your Skin's"
        titleHighlight="Natural Radiance"
        description="Unlock the glowing, youthful complexion hidden beneath dull, tired skin. Our customized rejuvenation treatments address texture, tone, and luminosity, delivering visible results from your very first session."
        image={heroFace}
        imageAlt="Woman with radiant, glowing skin after rejuvenation treatment"
        trustBadges={trustBadges}
        stats={{ value: "98%", label: "Client Satisfaction" }}
      />
      
      <ContentShowcase
        title="The Complete Guide to Professional Skin Rejuvenation"
        subtitle="Discover how targeted treatments can transform tired, dull skin into the radiant complexion you've always wanted."
        sections={[
          {
            icon: Sparkles,
            number: "01",
            title: "What is Skin Rejuvenation?",
            paragraphs: [
              "Skin rejuvenation is the art and science of restoring your skin's youthful vitality. Unlike basic skincare that works only on the surface, professional rejuvenation treatments penetrate deeper layers to stimulate cellular renewal, boost collagen production, and correct accumulated damage from sun exposure, stress, and the natural aging process.",
              "The result? Skin that doesn't just look better temporarily, but actually functions better: holding hydration more effectively, producing collagen more actively, and turning over cells at a more youthful rate."
            ],
            highlight: { value: "Deeper", label: "Than Surface Care" },
            keyTakeaway: "This is the difference between covering up problems with makeup and actually solving them at the source."
          },
          {
            icon: RefreshCw,
            number: "02",
            title: "Understanding Your Skin's Renewal Cycle",
            paragraphs: [
              "Your skin naturally renews itself approximately every 28 days in your twenties. As we age, this cycle slows, extending to 40, 50, or even 60 days in your forties and beyond. This sluggish turnover is why mature skin looks dull: dead cells accumulate on the surface, blocking light reflection.",
              "Professional rejuvenation treatments work by accelerating this natural cycle. Chemical peels remove the accumulated dead layer, revealing fresh cells beneath. LED therapy and other stimulating treatments signal your deeper cells to produce collagen and renew faster."
            ],
            highlight: { value: "28 Days", label: "Natural Renewal Cycle" }
          },
          {
            icon: Award,
            number: "03",
            title: "The Prairie Glow Approach",
            paragraphs: [
              "At Prairie Glow Beauty, we believe in customized, results-driven skincare. Your skin is unique, shaped by your genetics, lifestyle, environment, and history. A one-size-fits-all approach simply cannot address your specific concerns as effectively as a personalized protocol designed just for you.",
              "That's why every client journey begins with a comprehensive skin analysis. Using specialized lighting and magnification, we examine your skin at a level invisible to the naked eye. From this analysis, we craft a treatment plan that addresses both your immediate goals and long-term skin health."
            ],
            highlight: { value: "100%", label: "Personalized Plans" }
          },
          {
            icon: Droplets,
            number: "04",
            title: "Our Signature Glass Skin Facial",
            paragraphs: [
              "Named after the coveted Korean beauty ideal of translucent, poreless, dewy skin, our Glass Skin Facial has become our most requested treatment. This 75-minute protocol combines deep cleansing, gentle exfoliation, targeted treatment essences, and intensive hydration to achieve that lit-from-within glow.",
              "We use fermented ingredients that penetrate deeply, hyaluronic acid serums that hold 1000 times their weight in water, and protective antioxidants that shield against daily damage. Clients leave with immediately visible results."
            ],
            highlight: { value: "75 Min", label: "Signature Treatment" },
            keyTakeaway: "Unlike harsh treatments that strip the skin, our Glass Skin Facial works with your skin's natural processes."
          },
          {
            icon: FlaskConical,
            number: "05",
            title: "The Power of Chemical Peels",
            paragraphs: [
              "Despite the intimidating name, modern chemical peels are remarkably safe and effective when performed by trained professionals. These treatments use carefully formulated acid solutions to dissolve the bonds holding dead skin cells to your face. Once these cells release, fresh, undamaged skin is revealed beneath.",
              "We offer peels ranging from gentle \"lunchtime peels\" with no visible peeling to more intensive medical-grade peels for dramatic transformation. During your consultation, we'll recommend the appropriate peel strength for your goals and lifestyle."
            ],
            highlight: { value: "Zero", label: "Downtime Options" }
          },
          {
            icon: Zap,
            number: "06",
            title: "LED Light Therapy, The Gentle Giant",
            paragraphs: [
              "LED therapy represents the gentlest yet potentially most transformative technology in skin rejuvenation. Different wavelengths of light penetrate to different depths, triggering specific cellular responses. Blue light kills acne-causing bacteria. Red light stimulates collagen production and reduces inflammation.",
              "What makes LED therapy remarkable is its complete lack of downtime or discomfort. You simply relax under the light panels for 20-30 minutes while the photons work their magic at the cellular level."
            ],
            highlight: { value: "All Skin", label: "Types Safe" }
          }
        ]}
      />
      
      <ProblemSection
        headline="Is Your Skin Telling You Something?"
        subheadline="These common concerns signal that your skin is ready for professional rejuvenation."
        painPoints={painPoints}
        solutionTitle="Customized Rejuvenation Awaits"
        solutionDescription="Our range of professional treatments (from hydrating facials to medical-grade peels) can address these concerns and more. We'll analyze your skin and create a personalized protocol to reveal the radiant complexion hiding beneath the surface."
      />
      
      <TechnologyShowcase
        title="Our Rejuvenation Process"
        subtitle="Every treatment follows our proven three-phase approach for maximum results"
        technologyName="Multi-Modal Rejuvenation"
        technologyDescription="We combine the most effective technologies and techniques: chemical exfoliation, LED therapy, ultrasonic infusion, and medical-grade serums, customized for your unique skin type and concerns."
        steps={techSteps}
        certifications={["Medical-Grade Products", "LED Therapy", "Chemical Peels", "Custom Protocols"]}
      />
      
      <TreatmentAreas
        title="Our Rejuvenation Treatments"
        subtitle="Each treatment can be customized or combined for optimal results"
        areas={treatmentOptions}
        ctaText="View All Treatments & Pricing"
        ctaHref="/pricing"
      />
      
      <ExperienceTimeline
        title="Your Glow-Up Journey"
        subtitle="From analysis to radiance, here's what to expect"
        steps={experienceSteps}
      />
      
      <ServiceFAQ
        title="Skin Rejuvenation FAQs"
        subtitle="Everything you need to know about transforming your skin"
        faqs={faqs}
      />
      
      <ServiceCTA
        title="Ready to Reveal Your Best Skin?"
        subtitle="Book a complimentary skin analysis and discover which rejuvenation treatments will deliver the transformation you're looking for."
        urgencyText="New client openings available"
        primaryCTA={{ label: "Book Skin Analysis", href: "/booking?service=skin-rejuvenation" }}
        secondaryCTA={{ label: "Learn More", href: "/treatment" }}
      />
      
      <RelatedServices currentService="skin-rejuvenation" />
    </Layout>
  );
}
