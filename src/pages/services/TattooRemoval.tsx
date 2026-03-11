import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ProblemSection } from "@/components/services/ProblemSection";
import { TechnologyShowcase } from "@/components/services/TechnologyShowcase";
import { ExperienceTimeline } from "@/components/services/ExperienceTimeline";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { ServiceSchema } from "@/components/services/ServiceSchema";
import { ContentShowcase } from "@/components/services/ContentShowcase";
import { RelatedServices } from "@/components/services/RelatedServices";
import { motion } from "framer-motion";
import heroFace from "@/assets/hero-face-2.jpg";
import {
  Clock,
  Star,
  Shield,
  Zap,
  Target,
  Sparkles,
  Calendar,
  CheckCircle,
  ThumbsUp,
  Eraser,
  Palette,
  RefreshCw,
  Briefcase,
  Heart,
  FlaskConical,
  Users,
  Timer,
  MapPin,
} from "lucide-react";

const trustBadges = [
  { icon: Shield, label: "Medical-Grade", sublabel: "Lasers" },
  { icon: Zap, label: "All Ink Colors", sublabel: "Treatable" },
  { icon: Clock, label: "Visible Fading", sublabel: "Each Session" },
];

const painPoints = [
  {
    icon: Heart,
    title: "Ex's Name or Portrait",
    description: "That tattoo of a past relationship is a daily reminder of someone you've moved on from. Time for a fresh start.",
  },
  {
    icon: Briefcase,
    title: "Career Concerns",
    description: "Visible tattoos limiting your professional opportunities? Many industries still have strict appearance policies.",
  },
  {
    icon: RefreshCw,
    title: "Faded or Botched Work",
    description: "Poor quality work, blown-out lines, or fading that looks worse with time. You deserve better than a regrettable reminder.",
  },
  {
    icon: Palette,
    title: "Cover-Up Prep",
    description: "Want a new design but need the old one lightened first? Prepare your canvas for the artwork you've always wanted.",
  },
];

const techSteps = [
  {
    number: "01",
    icon: Target,
    title: "Target Ink",
    description: "Our Q-switched laser delivers ultra-short pulses that shatter ink particles into microscopic fragments.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Break Down",
    description: "Each color absorbs specific wavelengths. Multi-wavelength technology treats even stubborn blues and greens.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Natural Removal",
    description: "Your immune system naturally flushes fragmented ink particles over 6-8 weeks between sessions.",
  },
];

const inkColors = [
  { color: "Black", effectiveness: 95, description: "Most responsive to treatment" },
  { color: "Dark Blue", effectiveness: 90, description: "Excellent response" },
  { color: "Red", effectiveness: 85, description: "Very good response" },
  { color: "Green", effectiveness: 75, description: "Requires more sessions" },
  { color: "Yellow", effectiveness: 60, description: "Most challenging" },
  { color: "White", effectiveness: 50, description: "Limited response" },
];

const experienceSteps = [
  {
    icon: Calendar,
    title: "Free Consultation",
    description: "We assess your tattoo's size, colors, age, and location. We'll provide an honest estimate of sessions needed and expected results.",
    duration: "20 minutes",
  },
  {
    icon: Shield,
    title: "Treatment Planning",
    description: "Based on your goals (complete removal or cover-up prep) we create a customized treatment protocol.",
    duration: "Personalized",
  },
  {
    icon: Zap,
    title: "Laser Session",
    description: "We apply numbing cream, then use precise laser pulses to break down ink. Most describe it as a snapping sensation.",
    duration: "15-45 min",
  },
  {
    icon: CheckCircle,
    title: "Healing Period",
    description: "Expect redness and possible blistering for 1-2 weeks. Follow aftercare instructions for optimal fading.",
    duration: "6-8 weeks",
  },
  {
    icon: ThumbsUp,
    title: "Progressive Fading",
    description: "Watch your tattoo fade with each session. Most tattoos require 6-12 sessions for significant removal.",
    duration: "6-18 months",
  },
];

const faqs = [
  {
    question: "How many sessions does tattoo removal take?",
    answer: "Most tattoos require 6-12 sessions for significant fading or complete removal. Factors affecting session count include ink color, tattoo age, ink depth, skin type, and size. Black and dark blue inks typically fade fastest, while bright colors may need additional sessions. During your consultation, we'll provide a personalized estimate based on your specific tattoo.",
  },
  {
    question: "Does laser tattoo removal hurt?",
    answer: "Tattoo removal is more uncomfortable than getting the original tattoo. Most clients describe it as a hot rubber band snap combined with a burning sensation. We apply topical numbing cream before treatment to minimize discomfort. The good news? Sessions are quick, most last 15-30 minutes, and the discomfort ends immediately when the laser stops.",
  },
  {
    question: "Can all tattoo colors be removed?",
    answer: "Different colors respond differently to laser treatment. Black, dark blue, and dark green are easiest to remove. Red and orange fade well. Light blue, purple, and yellow are more stubborn. White and very light colors are most challenging and may darken initially. Our multi-wavelength laser can target most colors, though some may require more sessions.",
  },
  {
    question: "How much does tattoo removal cost?",
    answer: "Pricing is based on tattoo size and complexity. Small tattoos (under 2 inches) start at $100-150 per session. Medium tattoos (2-4 inches) range from $150-250. Large and complex pieces are priced individually. We offer package discounts of 15-20% when you commit to a treatment series. Complete removal may cost $600-$3,000+ depending on size and sessions needed.",
  },
  {
    question: "Will tattoo removal leave a scar?",
    answer: "When performed correctly with proper aftercare, laser tattoo removal rarely causes scarring. However, if your original tattoo caused scarring, that texture may remain after ink removal. Following aftercare instructions carefully (keeping the area clean, not picking at blisters, and protecting from sun) minimizes scarring risk. Our experienced technicians adjust settings to protect your skin.",
  },
  {
    question: "How long between tattoo removal sessions?",
    answer: "Sessions are typically spaced 6-8 weeks apart. This allows your body's immune system to flush away fragmented ink particles and your skin to fully heal. Rushing sessions doesn't speed results and may increase scarring risk. Some stubborn tattoos may benefit from even longer intervals of 10-12 weeks between later sessions.",
  },
  {
    question: "Can I lighten my tattoo for a cover-up instead of full removal?",
    answer: "Absolutely! Many clients come to us specifically for cover-up preparation. Lightening an existing tattoo gives your tattoo artist a cleaner canvas and more design flexibility. Typically, 2-4 sessions provide sufficient fading for most cover-up work. This is often faster and more affordable than complete removal while still achieving your goal.",
  },
  {
    question: "Are newer or older tattoos easier to remove?",
    answer: "Generally, older tattoos are easier to remove because the ink has already begun to break down and fade naturally. Very new tattoos (under 1 year) should be allowed to fully heal before starting removal. Tattoos that are 2-3+ years old typically respond faster to treatment. However, older tattoos with very dense, professionally-applied ink may still require multiple sessions.",
  },
  {
    question: "What's the aftercare for tattoo removal?",
    answer: "After treatment, the area may blister, scab, and feel sunburned. Apply antibiotic ointment and keep covered for the first few days. Avoid soaking in water (pools, baths) for 2 weeks. Don't pick at scabs or blisters. Let them heal naturally. Protect the area from sun exposure. Most healing occurs within 2-4 weeks, with continued fading over 6-8 weeks.",
  },
  {
    question: "Who should avoid laser tattoo removal?",
    answer: "Tattoo removal may not be suitable for those who are pregnant or nursing, have active skin infections in the treatment area, are prone to keloid scarring, are currently tanned in the treatment area, or take photosensitizing medications. Certain medical conditions may also affect candidacy. We screen all clients during the free consultation to ensure safe treatment.",
  },
];

export default function TattooRemoval() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Tattoo Removal", href: "/services/tattoo-removal" },
  ];

  return (
    <Layout>
      <SEO
        title="Tattoo Removal Niverville MB | Laser Tattoo Fading & Removal | Prairie Glow"
        description="Professional laser tattoo removal in Niverville, Manitoba. All ink colors treatable, cover-up prep available. Free consultation. See visible results each session."
        keywords="tattoo removal niverville, laser tattoo removal manitoba, tattoo fading, cover up prep, remove tattoo winnipeg, tattoo removal cost"
        canonical="/services/tattoo-removal"
      />
      <ServiceSchema
        serviceName="Laser Tattoo Removal"
        description="Professional laser tattoo removal using multi-wavelength Q-switched technology. Safe, effective removal for all ink colors."
        provider="Prairie Glow Beauty"
        areaServed="Niverville, Manitoba"
        url="https://laserhairremovalwinnipeg.ca/services/tattoo-removal"
        priceRange="$$"
      />
      
      <Breadcrumb items={breadcrumbItems} />
      
      <ServiceHero
        subtitle="Tattoo Removal Services"
        title="A Fresh Start for"
        titleHighlight="Your Skin"
        description="Whether it's a name you'd rather forget, a faded design, or prep for a stunning cover-up, our advanced laser technology makes tattoo removal safer and more effective than ever. Free consultation to map your transformation journey."
        image={heroFace}
        imageAlt="Clear, smooth skin after successful tattoo removal treatment"
        trustBadges={trustBadges}
        stats={{ value: "95%", label: "Ink Clearance Rate" }}
      />
      
      <ContentShowcase
        title="Your Complete Guide to Laser Tattoo Removal"
        subtitle="Everything you need to know about safely and effectively removing or fading unwanted tattoos at Prairie Glow Beauty."
        sections={[
          {
            icon: Zap,
            number: "01",
            title: "Understanding Laser Tattoo Removal",
            paragraphs: [
              "Laser tattoo removal has revolutionized how we address tattoo regret. Using highly concentrated light pulses measured in nanoseconds (billionths of a second), modern Q-switched lasers shatter ink particles trapped beneath the skin into microscopic fragments. These tiny particles are then naturally eliminated by your body's lymphatic system over weeks following each treatment.",
              "Unlike earlier removal methods like dermabrasion or surgical excision, laser removal works from the inside out. This means less tissue damage, reduced scarring risk, and more complete ink elimination."
            ],
            highlight: { value: "85-95%", label: "Fading Achievable" },
            keyTakeaway: "While no treatment guarantees 100% removal, most clients achieve excellent fading with proper treatment protocols."
          },
          {
            icon: Users,
            number: "02",
            title: "Why People Choose Tattoo Removal",
            paragraphs: [
              "Tattoo regret is more common than you might think. Studies suggest that nearly 25% of tattooed individuals eventually wish they hadn't gotten at least one of their tattoos. The reasons vary widely: relationship changes make a partner's name uncomfortable, career advancement requires a more conservative appearance, or simply, tastes and priorities evolve over time.",
              "At Prairie Glow, we see clients from all walks of life seeking removal. Some want complete erasure, a clean slate. Others seek partial fading to prepare their skin for a cover-up design that better reflects who they've become."
            ],
            highlight: { value: "25%", label: "Experience Tattoo Regret" },
            keyTakeaway: "Whatever your reason, there's no judgment here. Just professional support for your personal choice."
          },
          {
            icon: FlaskConical,
            number: "03",
            title: "The Technology Behind Modern Removal",
            paragraphs: [
              "Our clinic uses state-of-the-art Q-switched laser technology with multiple wavelengths. Different ink colors absorb different light wavelengths, which is why a multi-wavelength system is essential for treating colorful tattoos. Black ink absorbs all wavelengths well, making it the easiest to treat.",
              "The \"Q-switched\" designation refers to the incredibly short pulse duration, lasting just nanoseconds. This ultrafast delivery concentrates enormous energy into a tiny timeframe, shattering ink particles through a photoacoustic effect rather than burning them."
            ],
            highlight: { value: "All Colors", label: "Treatable" }
          },
          {
            icon: Timer,
            number: "04",
            title: "What Affects Your Removal Timeline",
            paragraphs: [
              "No two tattoos respond identically to laser treatment. Several factors influence how quickly your tattoo will fade. Ink color matters significantly: black fades fastest, while yellow, white, and light blue are most resistant. Ink depth and density affect treatment; professional tattoos often require more sessions than amateur tattoos.",
              "Your own physiology plays a role too. A robust immune system clears fragmented ink more efficiently. Good circulation to the treatment area speeds fading. Tattoo location also matters, as areas with rich blood supply typically fade faster than extremities."
            ],
            highlight: { value: "6-12", label: "Sessions Typical" }
          },
          {
            icon: Calendar,
            number: "05",
            title: "The Removal Process, Session by Session",
            paragraphs: [
              "Each laser session follows a careful protocol. We apply topical numbing cream 30-45 minutes before treatment to maximize comfort. You'll wear protective eyewear, and the treatment area will be cleaned. The laser handpiece delivers rapid pulses across the tattoo, with each pulse feeling like a hot rubber band snap.",
              "Immediately after treatment, the area will appear white (called \"frosting\") as gas escapes from the skin. The real magic happens over the next 6-8 weeks as your body clears the shattered ink, gradually revealing progressive fading before your next session."
            ],
            highlight: { value: "6-8 Weeks", label: "Between Sessions" }
          },
          {
            icon: MapPin,
            number: "06",
            title: "Serving Manitoba's Tattoo Removal Needs",
            paragraphs: [
              "Prairie Glow Beauty proudly offers professional tattoo removal services to Niverville, Steinbach, Winnipeg, and communities throughout southern Manitoba. Our experienced technicians combine advanced technology with compassionate care, understanding that tattoo removal is often an emotional journey as much as a physical one.",
              "Ready to explore your options? Book a free consultation today. We'll assess your tattoo, discuss your goals (whether complete removal or cover-up preparation) and create a personalized treatment plan to help you move forward with confidence."
            ],
            highlight: { value: "Free", label: "Consultation" }
          }
        ]}
      />
      
      <ProblemSection
        headline="Ready to Move Forward?"
        subheadline="Whatever your reason, we understand and we're here to help."
        painPoints={painPoints}
        solutionTitle="Professional Laser Tattoo Removal"
        solutionDescription="Our advanced multi-wavelength laser technology can treat virtually any tattoo, regardless of color or age. Whether you're seeking complete removal or preparing for a stunning cover-up, our team will create a personalized plan for your transformation."
      />
      
      <TechnologyShowcase
        title="How Laser Tattoo Removal Works"
        subtitle="Breaking down ink at the molecular level for natural elimination"
        technologyName="Q-Switched Nd:YAG Laser"
        technologyDescription="Our medical-grade Q-switched laser delivers ultra-short pulses of high-intensity light that shatter ink particles into microscopic fragments. Multiple wavelengths allow us to target all ink colors effectively while protecting your skin."
        steps={techSteps}
        certifications={["Health Canada Approved", "Multi-Wavelength", "All Ink Colors", "Safe for All Skin Types"]}
      />
      
      {/* Ink Color Guide */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">
              How Different Ink Colors Respond
            </h2>
            <p className="text-lg text-muted-foreground">
              Not all colors fade equally. Here's what to expect for each.
            </p>
          </motion.div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {inkColors.map((ink, index) => (
              <motion.div
                key={ink.color}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-5 rounded-2xl bg-secondary/50 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full border border-border"
                      style={{
                        backgroundColor:
                          ink.color === "Black" ? "#1a1a1a" :
                          ink.color === "Dark Blue" ? "#1e3a5f" :
                          ink.color === "Red" ? "#c41e3a" :
                          ink.color === "Green" ? "#2e7d32" :
                          ink.color === "Yellow" ? "#f9a825" :
                          "#f5f5f5"
                      }}
                    />
                    <span className="font-semibold">{ink.color}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{ink.description}</span>
                </div>
                <div className="h-2 rounded-full bg-background overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-glow-rose transition-all duration-1000"
                    style={{ width: `${ink.effectiveness}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {ink.effectiveness}% typical clearance rate
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      <ExperienceTimeline
        title="Your Removal Journey"
        subtitle="From consultation to clear skin, here's what to expect"
        steps={experienceSteps}
      />
      
      <ServiceFAQ
        title="Tattoo Removal Questions Answered"
        subtitle="Everything you need to know before starting your removal journey"
        faqs={faqs}
      />
      
      <ServiceCTA
        title="Ready for a Fresh Start?"
        subtitle="Whether you want complete removal or prep for a cover-up, we're here to help. Book your free consultation and let's discuss your options."
        urgencyText="Limited consultation spots available"
        primaryCTA={{ label: "Book Free Consultation", href: "/booking" }}
        secondaryCTA={{ label: "Have Questions?", href: "/contact" }}
      />
      
      <RelatedServices currentService="tattoo-removal" />
    </Layout>
  );
}
