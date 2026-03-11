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
import glassPortrait from "@/assets/glass-skin-portrait.jpg";
import {
  Clock,
  Star,
  Heart,
  Shield,
  Zap,
  Target,
  Sparkles,
  Calendar,
  CheckCircle,
  Users,
  Scissors,
  Timer,
  ThumbsUp,
  AlertCircle,
  TrendingUp,
  FlaskConical,
  Award,
  DollarSign,
  MapPin,
} from "lucide-react";

const trustBadges = [
  { icon: Shield, label: "Health Canada", sublabel: "Approved" },
  { icon: Zap, label: "Pain-Free", sublabel: "Treatment" },
  { icon: Heart, label: "All Skin Tones", sublabel: "Safe" },
];

const painPoints = [
  {
    icon: Scissors,
    title: "Endless Shaving",
    description: "Wasting 15+ minutes every shower, only to see stubble the next day. The cycle never ends.",
  },
  {
    icon: AlertCircle,
    title: "Painful Ingrown Hairs",
    description: "Red bumps, itching, and scarring from waxing and shaving that leave your skin looking worse.",
  },
  {
    icon: Timer,
    title: "Expensive Waxing",
    description: "Spending $100+ monthly on salon waxing that's painful, temporary, and time-consuming.",
  },
  {
    icon: TrendingUp,
    title: "Growing Frustration",
    description: "You've tried everything: creams, razors, epilators. But nothing gives lasting results.",
  },
];

const techSteps = [
  {
    number: "01",
    icon: Target,
    title: "Target",
    description: "Advanced lasers precisely target melanin in the hair follicle without damaging surrounding skin tissue.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Disable",
    description: "Concentrated light energy heats the follicle, disabling its ability to produce new hair growth permanently.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Reveal",
    description: "Over 6-8 sessions, experience up to 90% permanent hair reduction with silky smooth skin.",
  },
];

const treatmentAreas = [
  { icon: Users, name: "Full Face", description: "Upper lip, chin, sideburns, and cheeks. Perfect for facial peach fuzz and unwanted hair.", duration: "15-20 min", sessions: "6-8 sessions", popular: true },
  { icon: Users, name: "Underarms", description: "Say goodbye to daily shaving and dark shadows. One of our most popular treatment areas.", duration: "10-15 min", sessions: "6-8 sessions", popular: true },
  { icon: Users, name: "Bikini Line", description: "Choose from basic bikini to full Brazilian. Smooth, confident results that last.", duration: "20-30 min", sessions: "6-8 sessions", popular: true },
  { icon: Users, name: "Full Legs", description: "From ankle to thigh, experience silky smooth legs without the razor burn.", duration: "45-60 min", sessions: "6-8 sessions" },
  { icon: Users, name: "Half Legs", description: "Lower legs from knee to ankle. Perfect for those always wearing shorts or skirts.", duration: "25-35 min", sessions: "6-8 sessions" },
  { icon: Users, name: "Full Arms", description: "Wrist to shoulder coverage for confident, hair-free arms year-round.", duration: "30-40 min", sessions: "6-8 sessions" },
  { icon: Users, name: "Back", description: "Full back treatment for men and women. Large area coverage with lasting results.", duration: "40-50 min", sessions: "6-8 sessions" },
  { icon: Users, name: "Chest", description: "Chest and stomach treatments available. Popular for both men and women.", duration: "30-40 min", sessions: "6-8 sessions" },
];

const experienceSteps = [
  {
    icon: Calendar,
    title: "Free Consultation",
    description: "We assess your skin type, hair color, and treatment goals to create a personalized plan. No obligation.",
    duration: "15 minutes",
  },
  {
    icon: Shield,
    title: "Preparation",
    description: "Shave the treatment area 24 hours before. Avoid sun exposure and tanning for 2 weeks prior.",
    duration: "At home",
  },
  {
    icon: Zap,
    title: "Treatment Session",
    description: "Our advanced cooling technology ensures comfort while the laser works its magic. Most describe it as a warm snap.",
    duration: "15-60 min",
  },
  {
    icon: CheckCircle,
    title: "Aftercare",
    description: "Minor redness fades within hours. Avoid heat for 24-48 hours. Hair falls out over 1-2 weeks.",
    duration: "24-48 hrs",
  },
  {
    icon: ThumbsUp,
    title: "See Results",
    description: "After each session, notice significant reduction. After 6-8 sessions, enjoy up to 90% permanent hair loss.",
    duration: "Ongoing",
  },
];

const faqs = [
  {
    question: "Does laser hair removal hurt?",
    answer: "Most clients describe the sensation as a warm snap or rubber band flick. Our SharpLight technology includes integrated cooling that minimizes discomfort. Many clients find it far less painful than waxing. Sensitive areas like the bikini may feel slightly more intense, but treatments are quick and very manageable.",
  },
  {
    question: "How many sessions will I need for permanent results?",
    answer: "Most clients achieve optimal results with 6-8 sessions spaced 4-6 weeks apart. Hair grows in cycles, and laser only affects hair in the active growth phase. Multiple sessions ensure we target all follicles during their growth cycle. You'll notice significant reduction after just 2-3 sessions.",
  },
  {
    question: "Is laser hair removal safe for dark skin tones?",
    answer: "Absolutely! Our SharpLight technology is specifically designed to be safe and effective for all skin tones, including dark and melanin-rich skin. We adjust wavelengths and settings based on your unique skin type. During your consultation, we'll determine the optimal settings for your skin and hair combination.",
  },
  {
    question: "How much does laser hair removal cost?",
    answer: "Costs vary by treatment area. Small areas like underarms or upper lip start around $75-100 per session, while larger areas like full legs range from $200-350. We offer package deals that reduce per-session costs by 20-30%. Most clients find laser more cost-effective than a lifetime of waxing or razors.",
  },
  {
    question: "What should I do before my laser hair removal appointment?",
    answer: "Shave the treatment area 24 hours before your appointment. This allows the laser to target the follicle directly. Avoid sun exposure, tanning beds, and self-tanners for 2 weeks prior. Avoid waxing or plucking for 4 weeks as the hair root needs to be present. Come with clean, product-free skin.",
  },
  {
    question: "Are the results really permanent?",
    answer: "Laser hair removal provides permanent hair reduction of 80-90% in the treated area. Some fine or light-colored hairs may persist, and hormonal changes can occasionally stimulate new growth. Annual touch-up sessions can maintain your results. Treated follicles are permanently disabled and won't regrow.",
  },
  {
    question: "How long between laser hair removal sessions?",
    answer: "Sessions are typically spaced 4-6 weeks apart for body areas and 4 weeks for facial hair. This timing aligns with your natural hair growth cycles, ensuring we target hair in the active growth phase. Consistency is key. Sticking to your schedule maximizes results.",
  },
  {
    question: "Can I get laser hair removal if I have tattoos?",
    answer: "We cannot treat directly over tattoos as the laser may affect the ink. However, we can treat around tattooed areas with careful precision. If you have tattoos in or near your desired treatment area, mention this during your consultation so we can plan accordingly.",
  },
  {
    question: "What's the difference between laser and IPL hair removal?",
    answer: "Laser uses a single, concentrated wavelength for precise targeting, while IPL (Intense Pulsed Light) uses broad-spectrum light. Our SharpLight laser technology offers more power, deeper penetration, and faster results, especially effective for darker or coarser hair. It's the gold standard for permanent hair reduction.",
  },
  {
    question: "Is there any downtime after laser hair removal?",
    answer: "No significant downtime is required. You may experience mild redness or warmth for a few hours, similar to a mild sunburn. You can return to normal activities immediately. Just avoid hot showers, saunas, and intense exercise for 24-48 hours. Sun protection is essential post-treatment.",
  },
];

export default function LaserHairRemoval() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Laser Hair Removal", href: "/services/laser-hair-removal" },
  ];

  return (
    <Layout>
      <SEO
        title="Laser Hair Removal Niverville MB | Painless & Permanent Results | Prairie Glow"
        description="Experience permanent laser hair removal in Niverville, Manitoba. Safe for all skin tones, Health Canada approved technology, pain-free treatments. Book your free consultation today."
        keywords="laser hair removal niverville, permanent hair removal manitoba, painless laser hair removal, laser hair removal dark skin, bikini laser hair removal, underarm laser, full body laser hair removal"
        canonical="/services/laser-hair-removal"
      />
      <ServiceSchema
        serviceName="Laser Hair Removal"
        description="Professional laser hair removal services using Health Canada approved SharpLight technology. Safe for all skin tones with permanent results."
        provider="Prairie Glow Beauty"
        areaServed="Niverville, Manitoba"
        url="https://laserhairremovalwinnipeg.ca/services/laser-hair-removal"
        priceRange="$$"
      />
      
      <Breadcrumb items={breadcrumbItems} />
      
      <ServiceHero
        subtitle="Permanent Hair Reduction"
        title="Say Goodbye to"
        titleHighlight="Razors Forever"
        description="Experience the freedom of silky smooth skin with our advanced laser hair removal. Safe for all skin tones, virtually painless, and permanent results in just 6-8 sessions. Join over 500 clients who've ditched the razor for good."
        image={glassPortrait}
        imageAlt="Woman with smooth, hair-free skin after laser treatment"
        trustBadges={trustBadges}
        stats={{ value: "90%", label: "Hair Reduction" }}
      />
      
      <ContentShowcase
        title="The Ultimate Guide to Laser Hair Removal in Manitoba"
        subtitle="Everything you need to know about achieving permanent, silky-smooth skin with professional laser hair removal at Prairie Glow Beauty."
        sections={[
          {
            icon: Zap,
            number: "01",
            title: "What is Laser Hair Removal?",
            paragraphs: [
              "Laser hair removal is a medical-aesthetic procedure that uses concentrated light energy to permanently reduce unwanted hair. The laser emits a specific wavelength of light that is absorbed by the pigment (melanin) in hair follicles. This light energy converts to heat, which damages the follicle and inhibits future hair growth without harming the surrounding skin.",
              "Unlike temporary methods like shaving, waxing, or depilatory creams, laser hair removal targets the root cause of hair growth. After a series of treatments, most clients experience 80-90% permanent hair reduction in treated areas."
            ],
            highlight: { value: "80-90%", label: "Permanent Hair Reduction" },
            keyTakeaway: "It's a long-term investment that saves thousands of dollars and countless hours compared to a lifetime of traditional hair removal methods."
          },
          {
            icon: Award,
            number: "02",
            title: "Why Choose Prairie Glow?",
            paragraphs: [
              "At Prairie Glow Beauty in Niverville, Manitoba, we've invested in the industry-leading SharpLight laser technology, the same systems used by top medical spas worldwide. Our device features multiple wavelengths and integrated cooling, allowing us to safely and effectively treat all skin tones, from fair to dark.",
              "Our certified technicians undergo extensive training and continue their education to stay current with the latest techniques. We take a personalized approach to every treatment, carefully assessing your skin type, hair color, and goals during a complimentary consultation."
            ],
            highlight: { value: "All Skin Tones", label: "Safe & Effective" }
          },
          {
            icon: FlaskConical,
            number: "03",
            title: "The Science Behind Laser Hair Removal",
            paragraphs: [
              "Understanding how laser hair removal works helps set realistic expectations. Hair grows in three phases: anagen (active growth), catagen (transitional), and telogen (resting). Laser treatment is only effective during the anagen phase when the hair is actively connected to the follicle and contains the most melanin.",
              "At any given time, only 20-30% of your hair is in the active growth phase. This is why multiple sessions are necessary. Each treatment targets a new batch of follicles entering their growth cycle."
            ],
            highlight: { value: "6-8", label: "Sessions for Optimal Results" },
            keyTakeaway: "Sessions spaced 4-6 weeks apart ensure we target all follicles during their growth cycle for maximum permanent reduction."
          },
          {
            icon: Calendar,
            number: "04",
            title: "What to Expect During Your Treatment",
            paragraphs: [
              "Your laser hair removal journey begins with a free consultation where we assess your candidacy, discuss your goals, and perform a patch test if needed. On treatment day, arrive with clean, shaved skin (shaved 24 hours prior). We'll apply a cooling gel and provide protective eyewear.",
              "The treatment itself feels like a warm snap against the skin, far more comfortable than waxing. Our SharpLight technology features contact cooling that keeps the skin surface comfortable while the laser works beneath. Treatment times vary from 15 minutes for small areas to 60 minutes for larger zones.",
              "Post-treatment, you may experience mild redness that subsides within a few hours. Over the next 1-2 weeks, treated hair will shed naturally."
            ],
            highlight: { value: "15-60", label: "Minutes Per Session" }
          },
          {
            icon: DollarSign,
            number: "05",
            title: "Is Laser Hair Removal Worth It?",
            paragraphs: [
              "Consider the math: The average person spends $10,000-$23,000 on shaving supplies over a lifetime. Monthly waxing at $75 adds up to $900+ per year, totaling over $30,000 across decades. Factor in the time: 15 minutes shaving every other day equals 72 hours per year. Over 40 years, that's nearly 4 months of your life spent shaving.",
              "Laser hair removal typically costs $1,500-$3,000 for a complete treatment series, depending on areas treated. The one-time investment provides permanent results, freeing you from the endless cycle and expense of temporary methods."
            ],
            highlight: { value: "$30K+", label: "Lifetime Savings vs Waxing" },
            keyTakeaway: "Most clients consider it one of the best investments they've made in their self-care and confidence."
          },
          {
            icon: MapPin,
            number: "06",
            title: "Serving Niverville, Steinbach, and Greater Winnipeg",
            paragraphs: [
              "Prairie Glow Beauty is proud to bring professional-grade laser hair removal to the Niverville community. We serve clients from across Manitoba, including Steinbach, Winnipeg, and surrounding areas. Our convenient location and flexible scheduling make it easy to fit treatments into your busy life.",
              "Ready to experience the freedom of permanent hair reduction? Book your free consultation today and take the first step toward silky smooth skin that lasts."
            ],
            highlight: { value: "500+", label: "Happy Clients Served" }
          }
        ]}
      />
      
      <ProblemSection
        headline="Tired of the Hair Removal Struggle?"
        subheadline="You're not alone. These frustrations drive millions to seek a permanent solution."
        painPoints={painPoints}
        solutionTitle="There's a Better Way"
        solutionDescription="Professional laser hair removal eliminates unwanted hair at the source. Our Health Canada approved SharpLight technology delivers permanent results in just 6-8 sessions. Safe for all skin tones, with virtually no pain and zero downtime."
      />
      
      <TechnologyShowcase
        title="How Laser Hair Removal Works"
        subtitle="Advanced technology meets proven science for permanent results"
        technologyName="SharpLight Laser Technology"
        technologyDescription="Our medical-grade SharpLight system uses multiple wavelengths and integrated cooling to safely treat all skin types. Health Canada approved and clinically proven, it delivers precise energy to hair follicles while protecting surrounding tissue."
        steps={techSteps}
        certifications={["Health Canada Approved", "Clinically Proven", "All Skin Types"]}
      />
      
      <TreatmentAreas
        title="Treatment Areas"
        subtitle="From small touch-ups to full body, we've got you covered"
        areas={treatmentAreas}
        ctaText="View Pricing & Packages"
        ctaHref="/pricing"
      />
      
      <ExperienceTimeline
        title="What to Expect"
        subtitle="Your journey to permanent smooth skin, step by step"
        steps={experienceSteps}
      />
      
      <ServiceFAQ
        title="Frequently Asked Questions"
        subtitle="Get answers to the most common questions about laser hair removal"
        faqs={faqs}
      />
      
      <ServiceCTA
        title="Ready for Smooth, Hair-Free Skin?"
        subtitle="Join over 500 clients who've said goodbye to razors and waxing. Book your free consultation today and discover how easy permanent hair removal can be."
        urgencyText="Limited spots available this month"
        primaryCTA={{ label: "Book Free Consultation", href: "/booking?service=laser-hair-removal" }}
        secondaryCTA={{ label: "Questions? Contact Us", href: "/contact" }}
      />
      
      <RelatedServices currentService="laser-hair-removal" />
    </Layout>
  );
}
