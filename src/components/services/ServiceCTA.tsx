import { useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Calendar } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

interface ServiceCTAProps {
  title: string;
  subtitle: string;
  primaryCTA?: {
    label: string;
    href: string;
  };
  secondaryCTA?: {
    label: string;
    href: string;
  };
  urgencyText?: string;
}

export function ServiceCTA({
  title,
  subtitle,
  primaryCTA = { label: "Book Your Consultation", href: "/booking" },
  secondaryCTA = { label: "Contact Us", href: "/contact" },
  urgencyText,
}: ServiceCTAProps) {
  const { trackCTAClick } = useAnalytics();

  const handlePrimaryClick = useCallback(() => {
    trackCTAClick(`service_cta_${primaryCTA.label.toLowerCase().replace(/\s+/g, '_')}`, primaryCTA.href);
  }, [trackCTAClick, primaryCTA]);

  const handleSecondaryClick = useCallback(() => {
    trackCTAClick(`service_cta_${secondaryCTA.label.toLowerCase().replace(/\s+/g, '_')}`, secondaryCTA.href);
  }, [trackCTAClick, secondaryCTA]);

  return (
    <section className="py-20 lg:py-28 bg-foreground text-white relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-primary/20" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-glow-rose/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Urgency Badge */}
          {urgencyText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-glow-rose/20 text-glow-rose text-sm font-medium mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-glow-rose animate-pulse" />
              {urgencyText}
            </motion.div>
          )}
          
          {/* Headline */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">
            {title}
          </h2>
          
          {/* Subtitle */}
          <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            {subtitle}
          </p>
          
          {/* CTAs with tracking */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-glow-rose hover:bg-glow-rose/90 text-white w-full sm:w-auto"
              asChild
              onClick={handlePrimaryClick}
            >
              <Link to={primaryCTA.href}>
                <Calendar className="w-4 h-4 mr-2" />
                {primaryCTA.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white hover:text-foreground w-full sm:w-auto"
              asChild
              onClick={handleSecondaryClick}
            >
              <Link to={secondaryCTA.href}>
                <Phone className="w-4 h-4 mr-2" />
                {secondaryCTA.label}
              </Link>
            </Button>
          </div>
          
          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 pt-8 border-t border-white/10"
          >
            <p className="text-white/50 text-sm">
              ✓ Free Consultation &nbsp;&nbsp; ✓ No Obligation &nbsp;&nbsp; ✓ Same-Week Availability
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
