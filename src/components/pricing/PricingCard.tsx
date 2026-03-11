import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DaysiPublicServicePackage } from "@/lib/daysi-public-api";

interface PricingCardProps {
  servicePackage: DaysiPublicServicePackage;
  serviceNameBySlug: Record<string, string>;
  index: number;
  isPopular?: boolean;
}

const humanizeSlug = (value: string): string =>
  value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export function PricingCard({
  servicePackage,
  serviceNameBySlug,
  index,
  isPopular = false,
}: PricingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const includedServices = servicePackage.serviceCredits.map((credit) => {
    const serviceName = serviceNameBySlug[credit.serviceSlug] ?? humanizeSlug(credit.serviceSlug);
    const quantityLabel = `${credit.quantity} ${credit.quantity === 1 ? "session" : "sessions"}`;
    return `${quantityLabel} of ${serviceName}`;
  });
  const packageHighlights = [...includedServices, ...servicePackage.featureTags.map(humanizeSlug)]
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 4);
  const totalSessions = servicePackage.serviceCredits.reduce(
    (total, credit) => total + credit.quantity,
    0,
  );
  const savings = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        delay: index * 0.1,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative h-full"
    >
      {/* Card container with glassmorphism */}
      <motion.div
        animate={{
          y: isHovered ? -8 : 0,
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`
          relative h-full rounded-3xl p-8 flex flex-col
          backdrop-blur-xl border transition-shadow duration-300
          ${isPopular 
            ? "bg-foreground text-white border-primary/30 shadow-2xl z-10" 
            : "bg-white/70 dark:bg-card/70 border-white/50 dark:border-border/50 shadow-card"
          }
          ${isHovered && !isPopular ? "shadow-2xl shadow-primary/10" : ""}
          ${isHovered && isPopular ? "shadow-[0_25px_60px_-12px_rgba(236,72,153,0.3)]" : ""}
        `}
        style={{ willChange: "transform" }}
      >
        {/* Animated glow border on hover */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`
              absolute inset-0 rounded-3xl pointer-events-none
              ${isPopular 
                ? "bg-gradient-to-r from-primary/20 via-glow-rose/20 to-primary/20" 
                : "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              }
            `}
            style={{ 
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "exclude",
              padding: "2px",
            }}
          />
        )}

        {/* Popular Badge */}
        {isPopular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-glow-rose to-primary text-white text-sm font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Most Popular
            </motion.div>
          </div>
        )}

        {/* Savings Badge */}
        {savings && savings > 0 && (
          <div className="absolute -top-3 -right-3 z-20">
            <motion.div 
              initial={{ scale: 0.9, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md"
            >
              Save {savings}%
            </motion.div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6 flex-shrink-0">
          <h3 className="font-serif text-2xl font-semibold mb-2 line-clamp-2">
            {servicePackage.name}
          </h3>
          <p className={`text-sm line-clamp-2 ${isPopular ? "text-white/70" : "text-muted-foreground"}`}>
            {servicePackage.shortDescription || "Prepaid treatment package"}
          </p>
        </div>

        {/* Price Block */}
        <div className="text-center mb-6 flex-shrink-0">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-serif font-bold">
              ${(servicePackage.price.amountCents / 100).toFixed(0)}
            </span>
            <span className={isPopular ? "text-white/70" : "text-muted-foreground"}>CAD</span>
          </div>
          {totalSessions > 0 && (
            <span className={`text-sm ${isPopular ? "text-white/60" : "text-muted-foreground"}`}>
              {totalSessions} prepaid {totalSessions === 1 ? "session" : "sessions"}
            </span>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-grow">
          {packageHighlights.map((feature, i) => (
            <motion.li 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 + i * 0.05 }}
              className="flex items-start gap-3"
            >
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isPopular ? "text-glow-rose" : "text-primary"}`} />
              <span className={`text-sm ${isPopular ? "text-white/90" : ""}`}>{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA - pinned to bottom */}
        <div className="mt-auto flex-shrink-0">
          <Button
            variant={isPopular ? "glow" : "outline"}
            size="lg"
            className={`
              w-full group transition-all duration-300
              ${isHovered && !isPopular ? "bg-primary text-primary-foreground border-primary" : ""}
            `}
            asChild
          >
            <Link to="/contact">
              Ask About This Package
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Shine effect on hover */}
        {isHovered && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "200%", opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
