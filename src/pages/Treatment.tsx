import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Leaf, 
  Calendar
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { TreatmentHero } from "@/components/treatment/TreatmentHero";
import treatmentRoom from "@/assets/treatment-room.jpg";

const treatmentSteps = [
  {
    number: "01",
    title: "Deep Cleansing",
    description: "We begin with a thorough double cleanse to remove all impurities, makeup, and excess oils, preparing your skin for optimal treatment absorption.",
    duration: "10 min",
  },
  {
    number: "02",
    title: "Gentle Exfoliation",
    description: "A customized enzymatic or chemical exfoliation removes dead skin cells, revealing fresh, luminous skin beneath without irritation.",
    duration: "15 min",
  },
  {
    number: "03",
    title: "Extraction & Purification",
    description: "Careful, professional extraction clears congested pores while a purifying treatment addresses any inflammation or concerns.",
    duration: "15 min",
  },
  {
    number: "04",
    title: "Hydration Infusion",
    description: "Multiple layers of hydrating essences and serums are pressed into the skin, delivering intense moisture and nourishment.",
    duration: "15 min",
  },
  {
    number: "05",
    title: "Glass Skin Finish",
    description: "The signature finale: a luminosity-boosting treatment that seals in hydration and creates that coveted glass-like reflective glow.",
    duration: "20 min",
  },
];

const benefits = [
  "Visibly smaller pores",
  "Intense hydration boost",
  "Refined texture",
  "Enhanced skin clarity",
  "Natural luminosity",
  "Smoother texture",
  "Event-ready glow",
  "Photo-perfect finish",
];

const perfectFor = [
  {
    icon: Calendar,
    title: "Special Events",
    description: "Weddings, photoshoots, galas. Arrive with flawless, camera-ready skin.",
  },
  {
    icon: Sparkles,
    title: "Monthly Maintenance",
    description: "Keep your skin consistently clear and glowing with regular sessions.",
  },
  {
    icon: Leaf,
    title: "Skin Revival",
    description: "Combat dullness and uneven texture for renewed radiance.",
  },
];

const Treatment = () => {
  return (
    <Layout>
      <SEO
        title="Signature Glass Facial Niverville MB | Korean Glass Skin Treatment | Prairie Glow"
        description="Experience our 75-minute Signature Glass Facial in Niverville. Deep cleansing, hydration infusion, and luminous glass skin finish. Book your session near Winnipeg."
        keywords="glass facial niverville, korean glass skin treatment manitoba, signature facial winnipeg, hydrating facial near me, glass skin facial"
        canonical="/treatment"
      />
      {/* Hero */}
      <TreatmentHero />

      {/* Overview */}
      <section className="py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={treatmentRoom}
                  alt="Treatment room"
                  className="w-full h-auto"
                />
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-8 -right-8 glass-card p-6 shadow-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="font-serif text-3xl font-bold">75</div>
                    <div className="text-sm text-muted-foreground">Minutes of Luxury</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="font-serif text-4xl font-semibold mb-6">
                  What is Glass Skin?
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                  Born from Korean beauty traditions, "glass skin" describes 
                  complexion so clear, smooth, and luminous that it appears to 
                  reflect light like glass. It's the ultimate expression of 
                  healthy, hydrated, radiant skin.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Our Signature Glass Facial is meticulously designed to achieve 
                  this coveted look through a multi-step process that cleanses, 
                  treats, hydrates, and illuminates your skin.
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="grid grid-cols-2 gap-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Treatment Process */}
      <section className="py-24 bg-secondary/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              The Process
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold mt-3 mb-6">
              Your Journey to Glass Skin
            </h2>
            <p className="text-muted-foreground text-lg">
              Every step is carefully designed to build upon the last, creating 
              a transformative experience that leaves your skin luminous and renewed.
            </p>
          </motion.div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {treatmentSteps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-card flex flex-col md:flex-row gap-6 items-start"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-serif text-2xl font-bold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-serif text-2xl font-semibold">{step.title}</h3>
                    <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                      {step.duration}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Ideal For
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold mt-3">
              Who Should Book?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {perfectFor.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center p-8 rounded-3xl bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-serif text-2xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-foreground">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <Sparkles className="w-12 h-12 text-glow-rose mx-auto mb-6" />
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-white mb-6">
              Ready to Experience the Glow?
            </h2>
            <p className="text-xl text-white/70 mb-10">
              Book your Signature Glass Facial today and discover your most radiant skin yet.
            </p>
            <Button variant="glow" size="xl" asChild>
              <Link to="/booking">
                Book Your Session
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Treatment;
