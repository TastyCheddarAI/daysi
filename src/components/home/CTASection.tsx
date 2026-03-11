import { forwardRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";

export const CTASection = forwardRef<HTMLElement>((_, ref) => {
  const { trackCTAClick } = useAnalytics();

  const handleBookClick = useCallback(() => {
    trackCTAClick('cta_book_session', '/booking');
  }, [trackCTAClick]);

  const handleContactClick = useCallback(() => {
    trackCTAClick('cta_contact', '/contact');
  }, [trackCTAClick]);

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-foreground" />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-glow-pink/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-glow-rose/20 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-8 animate-glow-pulse">
            <Sparkles className="w-10 h-10 text-glow-rose" />
          </div>

          {/* Heading */}
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6">
            Ready for Your{" "}
            <span className="text-glow-rose">Glass Skin</span>{" "}
            Moment?
          </h2>

          {/* Description */}
          <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Join hundreds of clients who've discovered their most radiant skin yet.
            Book your Signature Glass Facial today and experience the glow.
          </p>

          {/* CTAs with tracking */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="glow" size="xl" asChild onClick={handleBookClick}>
              <Link to="/booking">
                Book Your Session
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button 
              variant="glass" 
              size="xl" 
              className="border-white/20 text-white hover:bg-white/20" 
              asChild
              onClick={handleContactClick}
            >
              <Link to="/contact">
                Get in Touch
              </Link>
            </Button>
          </div>

          {/* Urgency Note */}
          <p className="text-white/50 text-sm mt-8">
            Limited appointments available each month. Book early to secure your spot.
          </p>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";
