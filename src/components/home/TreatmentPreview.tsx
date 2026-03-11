import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Droplets, Sparkles, Sun, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import treatmentRoom from "@/assets/treatment-room.jpg";

const benefits = [
  {
    icon: Sparkles,
    title: "Crystal Clarity",
    description: "Dramatically reduce the appearance of pores and imperfections for a flawless, airbrushed finish.",
  },
  {
    icon: Droplets,
    title: "Deep Hydration",
    description: "Infuse your skin with essential moisture for that coveted dewy, luminous glass-like glow.",
  },
  {
    icon: Sun,
    title: "Radiant Luminosity",
    description: "Achieve natural, filter-worthy radiance that photographs beautifully in any lighting.",
  },
  {
    icon: Heart,
    title: "Pore Refinement",
    description: "Minimize pore appearance and dullness, revealing your skin's natural brilliance.",
  },
];

export function TreatmentPreview() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden">
              <img
                src={treatmentRoom}
                alt="Luxurious treatment room"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            
            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="absolute -bottom-8 -right-8 glass-card p-6 shadow-card"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="font-serif text-3xl font-bold text-primary">75</div>
                  <div className="text-xs text-muted-foreground">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="font-serif text-3xl font-bold text-primary">98%</div>
                  <div className="text-xs text-muted-foreground">Satisfaction</div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div>
              <span className="text-primary font-medium text-sm uppercase tracking-wider">
                Our Signature Treatment
              </span>
              <h2 className="font-serif text-4xl md:text-5xl font-semibold mt-3 mb-6">
                The Glass Facial Experience
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Inspired by Korean beauty secrets, our Signature Glass Facial is a 
                multi-step luxury treatment designed to transform your complexion into 
                a luminous, glass-like canvas. Perfect for special events, photoshoots, 
                or your monthly glow maintenance.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid sm:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button variant="hero" size="lg" asChild>
              <Link to="/treatment">
                Discover the Treatment
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
