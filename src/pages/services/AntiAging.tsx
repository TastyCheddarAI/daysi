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
import heroFace from "@/assets/hero-face-4.jpg";
import {
  Clock,
  Star,
  Shield,
  Zap,
  Sparkles,
  Calendar,
  CheckCircle,
  ThumbsUp,
  Frown,
  TrendingDown,
  Droplets,
  Layers,
  Heart,
  RefreshCw,
  FlaskConical,
  MapPin,
} from "lucide-react";

const trustBadges = [
  { icon: Heart, label: "Non-Invasive", sublabel: "Treatments" },
  { icon: Clock, label: "Natural", sublabel: "Results" },
  { icon: Shield, label: "Proven", sublabel: "Technology" },
];

const painPoints = [
  {
    icon: Frown,
    title: "Fine Lines & Wrinkles",
    description: "Those expression lines around your eyes and forehead are becoming permanent. Smile lines that once disappeared now linger.",
  },
  {
    icon: TrendingDown,
    title: "Loss of Firmness",
    description: "Skin that used to bounce back now sags. Jawline definition is fading, and cheeks have lost their youthful volume.",
  },
  {
    icon: Droplets,
    title: "Dehydration & Dullness",
    description: "Skin feels perpetually dry despite moisturizing. That youthful dewiness has given way to a tired, lackluster appearance.",
  },
  {
    icon: Layers,
    title: "Thinning & Fragility",
    description: "Skin is becoming more delicate, prone to bruising, and shows every imperfection more prominently than before.",
  },
];

const techSteps = [
  {
    number: "01",
    icon: Zap,
    title: "Stimulate",
    description: "Advanced treatments signal your cells to ramp up collagen and elastin production, the proteins of youth.",
  },
  {
    number: "02",
    icon: Droplets,
    title: "Hydrate",
    description: "Deep moisture infusion plumps skin from within, filling fine lines and restoring the dewy bounce of youth.",
  },
  {
    number: "03",
    icon: Shield,
    title: "Protect",
    description: "Antioxidant treatments and barrier repair prevent future damage while locking in your rejuvenated results.",
  },
];

const treatmentOptions = [
  { icon: Sparkles, name: "Collagen Induction Therapy", description: "Microneedling stimulates your skin's natural healing response, triggering dramatic collagen production.", duration: "60-90 min", sessions: "Series of 3-6", popular: true },
  { icon: Zap, name: "LED Anti-Aging Therapy", description: "Red and near-infrared light penetrates deep to boost collagen, reduce inflammation, and accelerate cellular repair.", duration: "30 min", sessions: "Weekly series" },
  { icon: Droplets, name: "Hydrating Age-Defying Facial", description: "Intensive moisture infusion with peptides and growth factors to plump, firm, and illuminate mature skin.", duration: "75 min", sessions: "Monthly", popular: true },
  { icon: Layers, name: "Resurfacing Peels", description: "Medical-grade peels address fine lines, age spots, and texture while revealing fresh, youthful skin beneath.", duration: "45-60 min", sessions: "Series of 4-6" },
  { icon: RefreshCw, name: "Firming & Lifting Treatment", description: "Microcurrent and radiofrequency technologies tone facial muscles and tighten skin for a lifted appearance.", duration: "60 min", sessions: "Series of 8-12", popular: true },
  { icon: Heart, name: "Neck & Décolletage Renewal", description: "Don't neglect these telltale areas. Specialized treatments address crepey skin and sun damage below the face.", duration: "45 min", sessions: "Monthly" },
];

const experienceSteps = [
  {
    icon: Calendar,
    title: "Aging Analysis",
    description: "We assess your skin's current state, identify the primary aging mechanisms affecting you, and discuss your realistic goals.",
    duration: "20 minutes",
  },
  {
    icon: Shield,
    title: "Custom Anti-Aging Protocol",
    description: "Based on your unique aging patterns and concerns, we design a multi-modal treatment plan addressing all aspects of skin aging.",
    duration: "Personalized",
  },
  {
    icon: Zap,
    title: "Treatment Session",
    description: "Experience our sophisticated treatments in a relaxing spa environment. Many clients find the process as enjoyable as the results.",
    duration: "45-90 min",
  },
  {
    icon: CheckCircle,
    title: "Progressive Transformation",
    description: "Anti-aging results build over time as collagen regenerates. Each session builds on the last for cumulative improvement.",
    duration: "Ongoing",
  },
  {
    icon: ThumbsUp,
    title: "Maintenance & Prevention",
    description: "Once goals are achieved, we transition to a maintenance protocol that keeps you looking years younger, indefinitely.",
    duration: "Long-term",
  },
];

const faqs = [
  {
    question: "When should I start anti-aging treatments?",
    answer: "Prevention is the best anti-aging strategy, so starting in your mid-to-late twenties with protective treatments and good skincare habits is ideal. However, it's never too late to begin! The skin responds to stimulation at any age. Many clients in their 40s, 50s, and beyond see dramatic improvements from professional anti-aging treatments. The best time to start was years ago. The second best time is now.",
  },
  {
    question: "What's the difference between anti-aging treatments and Botox/fillers?",
    answer: "Our non-invasive anti-aging treatments work with your skin's natural processes to stimulate collagen production, improve cellular function, and enhance overall skin health. They create real, lasting change in your skin's structure. Botox and fillers are medical procedures that temporarily relax muscles or add volume. Many clients use both approaches complementarily. Our treatments improve overall skin quality while injectables address specific concerns. We can work alongside your injector for optimal results.",
  },
  {
    question: "How long until I see anti-aging results?",
    answer: "Some improvements are visible immediately: better hydration, enhanced glow, and smoother texture often appear right after treatment. However, the most significant anti-aging results (increased collagen, improved firmness, reduced wrinkles) develop over 8-12 weeks as your skin regenerates. A series of treatments spaced appropriately provides cumulative benefits that continue building for months. Patience and consistency are rewarded with lasting transformation.",
  },
  {
    question: "Are anti-aging treatments painful?",
    answer: "Most of our anti-aging treatments are comfortable and even relaxing. Facials and LED therapy feel spa-like. For treatments like microneedling that involve controlled skin stimulation, we apply topical numbing cream beforehand. Most clients describe the sensation as mild and very tolerable. Any temporary discomfort is brief and quickly forgotten when you see your rejuvenated results.",
  },
  {
    question: "What's the best anti-aging treatment for wrinkles?",
    answer: "The most effective approach depends on the type and depth of wrinkles. Fine lines often respond beautifully to hydrating treatments and light peels. Deeper expression lines benefit from collagen induction therapy (microneedling). Overall skin texture and tone improve with resurfacing treatments. For most clients, a combination approach addressing multiple aging mechanisms delivers the most comprehensive wrinkle reduction. We'll recommend the ideal protocol during your consultation.",
  },
  {
    question: "Can anti-aging treatments help with sagging skin?",
    answer: "Yes, though expectations should be realistic. Non-invasive treatments can improve mild to moderate laxity through collagen stimulation, improved skin quality, and muscle toning (microcurrent). Results include a more lifted appearance, better-defined contours, and firmer-feeling skin. However, significant sagging may require surgical intervention for dramatic lifting. We're honest about what non-invasive treatments can achieve for your specific concerns.",
  },
  {
    question: "How often do I need anti-aging treatments?",
    answer: "Treatment frequency varies by modality and your goals. During an initial transformation phase, more frequent sessions (weekly or bi-weekly) may be recommended. As you achieve your goals, we transition to a maintenance schedule, typically monthly facials and quarterly intensive treatments. Many clients view these appointments as essential self-care, maintaining their results while preventing further aging. We'll create a sustainable long-term plan that fits your lifestyle.",
  },
  {
    question: "What should I do at home to support my anti-aging treatments?",
    answer: "Professional treatments are most effective when supported by excellent home care. Key elements include daily SPF 30+ sunscreen (sun damage causes 80% of visible aging), retinoid use (vitamin A derivatives that stimulate collagen), antioxidant serums (vitamin C, E, ferulic acid), and hydrating products. We'll recommend a customized home routine that maximizes your treatment investment and maintains your results between sessions.",
  },
  {
    question: "Are anti-aging treatments safe for sensitive skin?",
    answer: "Absolutely! We offer treatments suitable for even the most reactive skin types. Our approach is always customized. We choose gentler modalities, adjust treatment intensities, and select products specifically formulated for sensitive skin. LED therapy, for example, is completely non-irritating and actually calms sensitivity while delivering anti-aging benefits. During your consultation, we'll identify any sensitivities and design a protocol that's both effective and comfortable for your skin.",
  },
  {
    question: "Can anti-aging treatments address dark spots and uneven tone?",
    answer: "Yes! Hyperpigmentation (age spots, sun spots, and uneven tone) is one of the most common signs of aging, and it's very treatable. Chemical peels, certain laser treatments, and targeted serums can significantly lighten discoloration and even skin tone. Combined with collagen-stimulating treatments, we can address both color and texture concerns simultaneously. Consistent sun protection is essential to prevent new pigmentation while treating existing spots.",
  },
];

export default function AntiAging() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Anti-Aging", href: "/services/anti-aging" },
  ];

  return (
    <Layout>
      <SEO
        title="Anti-Aging Treatments Niverville MB | Wrinkle Reduction & Skin Firming | Prairie Glow"
        description="Turn back the clock with professional anti-aging treatments in Niverville, Manitoba. Collagen induction, LED therapy, microneedling. Non-invasive, natural results."
        keywords="anti aging treatments niverville, wrinkle treatment manitoba, skin firming, collagen treatment, microneedling winnipeg, non invasive facelift"
        canonical="/services/anti-aging"
      />
      <ServiceSchema
        serviceName="Anti-Aging Treatments"
        description="Professional non-invasive anti-aging treatments including collagen induction therapy, LED therapy, and advanced facials for youthful, radiant skin."
        provider="Prairie Glow Beauty"
        areaServed="Niverville, Manitoba"
        url="https://laserhairremovalwinnipeg.ca/services/anti-aging"
        priceRange="$$"
      />
      
      <Breadcrumb items={breadcrumbItems} />
      
      <ServiceHero
        subtitle="Anti-Aging Solutions"
        title="Age Gracefully,"
        titleHighlight="Glow Naturally"
        description="Turn back the clock without going under the knife. Our advanced, non-invasive treatments stimulate your skin's natural regenerative powers, boosting collagen, restoring firmness, and recapturing the radiant complexion of years past."
        image={heroFace}
        imageAlt="Mature woman with youthful, radiant skin after anti-aging treatment"
        trustBadges={trustBadges}
        stats={{ value: "5-10 Years", label: "Younger Looking Skin" }}
      />
      
      <ContentShowcase
        title="The Science of Aging Gracefully"
        subtitle="Understanding how skin ages is the first step to effectively reversing and preventing visible signs of time."
        sections={[
          {
            icon: FlaskConical,
            number: "01",
            title: "Why Does Skin Age?",
            paragraphs: [
              "Skin aging is a complex process driven by both intrinsic factors (genetics, hormones, time) and extrinsic factors (sun exposure, pollution, lifestyle). Beginning in our mid-twenties, collagen production decreases by about 1% per year.",
              "The good news? Many of these processes can be slowed, halted, or even partially reversed with the right interventions."
            ],
            highlight: { value: "1%", label: "Collagen Loss Per Year" },
            keyTakeaway: "Modern anti-aging treatments work by stimulating the skin's innate regenerative capacity."
          },
          {
            icon: Sparkles,
            number: "02",
            title: "The Collagen Connection",
            paragraphs: [
              "Collagen is the protein that gives skin its structure, firmness, and bounce. When collagen is abundant, skin looks plump and line-free. As collagen depletes, wrinkles form and skin begins to sag.",
              "Many of our most effective anti-aging treatments focus specifically on collagen stimulation through microneedling, LED therapy, and specialized peptides."
            ],
            highlight: { value: "Collagen", label: "Key to Youthful Skin" }
          },
          {
            icon: Layers,
            number: "03",
            title: "Beyond Collagen, A Holistic Approach",
            paragraphs: [
              "While collagen is crucial, truly comprehensive anti-aging addresses multiple factors. Hydration is essential: well-hydrated skin looks plumper. Cellular turnover must be optimized. Antioxidant protection prevents oxidative damage.",
              "At Prairie Glow, our anti-aging protocols address all these concerns simultaneously for more dramatic, longer-lasting results."
            ],
            highlight: { value: "Multi-Modal", label: "Treatment Approach" }
          },
          {
            icon: Zap,
            number: "04",
            title: "Collagen Induction Therapy",
            paragraphs: [
              "Microneedling has emerged as one of the most effective non-invasive anti-aging treatments available. We create thousands of microscopic punctures that trigger your body's natural healing response, flooding the area with growth factors.",
              "Fine lines soften, scars diminish, pores appear smaller, and skin develops a firmer, more refined texture over 3-6 treatments."
            ],
            highlight: { value: "3-6", label: "Treatments for Results" }
          },
          {
            icon: Heart,
            number: "05",
            title: "LED Therapy for Anti-Aging",
            paragraphs: [
              "LED therapy harnesses specific wavelengths of light to trigger cellular responses that combat aging. Red light penetrates deeply to stimulate fibroblasts and boost collagen. Near-infrared light promotes cellular healing at the tissue level.",
              "The treatment is completely painless. You simply relax under the light panels while photons work their magic."
            ],
            highlight: { value: "Painless", label: "& Relaxing" }
          },
          {
            icon: MapPin,
            number: "06",
            title: "Begin Your Age-Defying Journey",
            paragraphs: [
              "Aging is inevitable, but how you age is not entirely predetermined. With the right professional interventions, you can maintain youthful, vibrant skin for decades longer than genetics alone would allow.",
              "Schedule a complimentary aging analysis and consultation. We'll map out a personalized pathway to the more youthful complexion you deserve."
            ],
            highlight: { value: "Free", label: "Consultation" }
          }
        ]}
      />
      
      <ProblemSection
        headline="Recognizing the Signs of Aging Skin"
        subheadline="These changes indicate that your skin is ready for professional intervention."
        painPoints={painPoints}
        solutionTitle="Non-Invasive Anti-Aging Excellence"
        solutionDescription="Our advanced treatments stimulate your skin's natural regenerative processes, boosting collagen, restoring hydration, and reversing visible signs of aging. No surgery, no injectables. Just scientifically proven methods for naturally youthful skin."
      />
      
      <TechnologyShowcase
        title="Our Anti-Aging Approach"
        subtitle="A multi-modal strategy that addresses all aspects of skin aging"
        technologyName="Comprehensive Age-Reversal Protocol"
        technologyDescription="We combine collagen induction therapy, LED phototherapy, advanced serums, and proven topicals to create customized treatment protocols that address your unique aging patterns and goals."
        steps={techSteps}
        certifications={["Non-Invasive", "Clinically Proven", "All Skin Types", "Natural Results"]}
      />
      
      <TreatmentAreas
        title="Anti-Aging Treatments"
        subtitle="Each protocol can be customized to your specific aging concerns"
        areas={treatmentOptions}
        ctaText="See Pricing & Packages"
        ctaHref="/pricing"
      />
      
      <ExperienceTimeline
        title="Your Transformation Journey"
        subtitle="From analysis to ageless, here's what to expect"
        steps={experienceSteps}
      />
      
      <ServiceFAQ
        title="Anti-Aging Questions Answered"
        subtitle="Everything you need to know about turning back the clock"
        faqs={faqs}
      />
      
      <ServiceCTA
        title="Ready to Look Years Younger?"
        subtitle="Book your complimentary aging analysis and discover which treatments will deliver the transformation you're dreaming of. Your journey to ageless beauty begins today."
        urgencyText="Limited new client spots available"
        primaryCTA={{ label: "Book Free Consultation", href: "/booking" }}
        secondaryCTA={{ label: "Have Questions?", href: "/contact" }}
      />
      
      <RelatedServices currentService="anti-aging" />
    </Layout>
  );
}
