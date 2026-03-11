import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Eraser, Sparkles, Heart } from "lucide-react";

const services = [
  {
    icon: Zap,
    title: "Laser Hair Removal",
    description: "Permanent results. Pain-free technology. Safe for all skin tones.",
    href: "/services/laser-hair-removal",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Eraser,
    title: "Tattoo Removal",
    description: "A fresh start for your skin. All ink colors treatable.",
    href: "/services/tattoo-removal",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Sparkles,
    title: "Skin Rejuvenation",
    description: "Reveal your natural radiance with customized treatments.",
    href: "/services/skin-rejuvenation",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Heart,
    title: "Anti-Aging",
    description: "Turn back time with collagen-boosting, non-invasive solutions.",
    href: "/services/anti-aging",
    gradient: "from-teal-500 to-cyan-500",
  },
];

export function ServicesSection() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-background via-secondary/30 to-background relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-glow-blush/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-glow-rose/15 rounded-full blur-3xl" />
      
      <div className="container mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">
            Expert Treatments,{" "}
            <span className="bg-gradient-to-r from-primary via-glow-rose to-glow-pink bg-clip-text text-transparent">
              Exceptional Results
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Discover our range of advanced aesthetic treatments designed to help you look and feel your absolute best.
          </p>
        </motion.div>
        
        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                to={service.href}
                className="group block h-full p-6 rounded-3xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-2"
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="font-serif text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {service.description}
                </p>
                
                {/* Link */}
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                  <span>Learn More</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
