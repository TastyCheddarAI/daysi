import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import glassSkinPortrait from "@/assets/glass-skin-portrait.jpg";
import heroFace2 from "@/assets/hero-face-2.jpg";
import heroFace3 from "@/assets/hero-face-3.jpg";
import heroFace4 from "@/assets/hero-face-4.jpg";

const heroImages = [glassSkinPortrait, heroFace2, heroFace3, heroFace4];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([true, false, false, false]);
  const { trackCTAClick } = useAnalytics();

  // Preload next image when current changes
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % heroImages.length;
    if (!imagesLoaded[nextIndex]) {
      const img = new Image();
      img.src = heroImages[nextIndex];
      img.onload = () => {
        setImagesLoaded(prev => {
          const updated = [...prev];
          updated[nextIndex] = true;
          return updated;
        });
      };
    }
  }, [currentIndex, imagesLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % heroImages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleBookClick = useCallback(() => {
    trackCTAClick('hero_book_session', '/booking');
  }, [trackCTAClick]);

  const handleLearnMoreClick = useCallback(() => {
    trackCTAClick('hero_learn_more', '/treatment');
  }, [trackCTAClick]);

  return (
    <section className="relative h-[100dvh] min-h-[700px] max-h-[1000px] flex items-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-glow-blush via-white to-glow-cream" />
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-glow-rose/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-glow-pink/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 xl:gap-12 items-center h-full">
          {/* Content - Centered */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center space-y-6"
          >
            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight"
            >
              Experience Canada's Best{" "}
              <span className="gradient-text">Glass Facial</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-lg leading-relaxed"
            >
              Laser Hair Removal - Tattoo Removal - Skin Rejuvenation - Anti Aging Treatments
            </motion.p>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-x-6 gap-y-2"
            >
              {["Flawless Finish", "Event Ready Glow", "Clear Complexion"].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTAs - Centered with tracking */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-col sm:flex-row justify-center gap-4 pt-2"
            >
              <Button variant="hero" size="lg" asChild onClick={handleBookClick}>
                <Link to="/booking">
                  Book Your Session
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild onClick={handleLearnMoreClick}>
                <Link to="/treatment">Learn More</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Image Carousel - Right Side with LCP optimization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:flex justify-center items-center w-full"
          >
            {/* Main Image Container */}
            <div className="relative w-full max-w-full">
              {/* Glow Effect Behind Image */}
              <div className="absolute -inset-4 bg-gradient-to-br from-glow-pink/30 via-glow-rose/20 to-glow-blush/30 rounded-[2rem] blur-2xl" />
              
              {/* Image Carousel with optimized loading */}
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-[3/4]">
                {/* First image: eager load with high priority for LCP */}
                <img
                  src={heroImages[0]}
                  alt="Glass skin facial result - luminous glowing skin at Prairie Glow Beauty Niverville MB"
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: currentIndex === 0 ? 1 : 0,
                    transform: currentIndex === 0 ? 'scale(1)' : 'scale(1.05)',
                    transition: 'opacity 1.2s ease-in-out, transform 1.5s ease-out',
                    zIndex: currentIndex === 0 ? 1 : 0
                  }}
                />
                
                {/* Remaining images: lazy load only when needed */}
                {heroImages.slice(1).map((src, idx) => {
                  const index = idx + 1;
                  const shouldLoad = imagesLoaded[index] || index === currentIndex || index === (currentIndex + 1) % heroImages.length;
                  const altTexts = [
                    "",
                    "Radiant skin after laser treatment - smooth clear complexion Prairie Glow Beauty",
                    "Professional facial treatment results - glowing skin Niverville Manitoba",
                    "Anti-aging treatment results - youthful rejuvenated skin Prairie Glow"
                  ];
                  
                  return shouldLoad ? (
                    <img
                      key={index}
                      src={src}
                      alt={altTexts[index]}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        opacity: index === currentIndex ? 1 : 0,
                        transform: index === currentIndex ? 'scale(1)' : 'scale(1.05)',
                        transition: 'opacity 1.2s ease-in-out, transform 1.5s ease-out',
                        zIndex: index === currentIndex ? 1 : 0
                      }}
                    />
                  ) : null;
                })}
                
                {/* Subtle Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-glow-pink/10 via-transparent to-white/5" />

                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}