import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";

interface TrustBadge {
  icon: LucideIcon;
  label: string;
  sublabel: string;
}

interface ServiceHeroProps {
  subtitle: string;
  title: string;
  titleHighlight?: string;
  description: string;
  image: string;
  imageAlt: string;
  trustBadges: TrustBadge[];
  primaryCTA?: {
    label: string;
    href: string;
  };
  secondaryCTA?: {
    label: string;
    href: string;
  };
  stats?: {
    value: string;
    label: string;
  };
}

export function ServiceHero({
  subtitle,
  title,
  titleHighlight,
  description,
  image,
  imageAlt,
  trustBadges,
  primaryCTA = { label: "Book Consultation", href: "/booking" },
  secondaryCTA = { label: "See Results", href: "/gallery" },
  stats,
}: ServiceHeroProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-24 pb-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-secondary/50" />
      
      {/* Decorative orbs */}
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-glow-blush/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-glow-rose/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="order-2 lg:order-1 text-center lg:text-left"
          >
            {/* Subtitle Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 mx-auto lg:mx-0"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">{subtitle}</span>
            </motion.div>
            
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-6"
            >
              {title}{" "}
              {titleHighlight && (
                <span className="bg-gradient-to-r from-primary via-glow-rose to-glow-pink bg-clip-text text-transparent">
                  {titleHighlight}
                </span>
              )}
            </motion.h1>
            
            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
            >
              {description}
            </motion.p>
            
            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start"
            >
              {trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm"
                >
                  <badge.icon className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <span className="font-semibold">{badge.label}</span>
                    <span className="text-muted-foreground ml-1">{badge.sublabel}</span>
                  </div>
                </div>
              ))}
            </motion.div>
            
            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <Button variant="hero" size="lg" asChild>
                <Link to={primaryCTA.href}>
                  {primaryCTA.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link to={secondaryCTA.href}>{secondaryCTA.label}</Link>
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="order-1 lg:order-2 relative"
          >
            {/* Glow effect behind image */}
            <div className="absolute inset-0 bg-gradient-to-br from-glow-blush via-glow-rose to-glow-pink rounded-3xl blur-2xl opacity-40 scale-95" />
            
            {/* Main image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={image}
                alt={imageAlt}
                className="w-full h-auto object-cover aspect-[4/5]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
            </div>
            
            {/* Floating stats card */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-4 -left-4 md:-left-8 p-4 rounded-2xl bg-background/95 backdrop-blur-xl border border-border shadow-xl"
              >
                <div className="text-2xl font-serif font-semibold text-primary">{stats.value}</div>
                <div className="text-sm text-muted-foreground">{stats.label}</div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
