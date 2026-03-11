import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Star, Heart, Award, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import glassSkinPortrait from "@/assets/glass-skin-portrait.jpg";

const trustBadges = [
  { icon: Clock, label: "75 Minutes", sublabel: "Full Treatment" },
  { icon: Star, label: "5-Star Rated", sublabel: "100+ Reviews" },
  { icon: Heart, label: "98%", sublabel: "Satisfaction" },
  { icon: Award, label: "Award-Winning", sublabel: "Technique" },
];

export function TreatmentHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-24 pb-12">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-glow-blush via-white to-glow-cream" />
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-glow-rose/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-glow-pink/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10 py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col space-y-6 text-center lg:text-left"
          >
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight"
            >
              The <span className="gradient-text">Glass Facial</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed"
            >
              Experience the ultimate in skin transformation. Our signature 75-minute treatment 
              combines advanced techniques to deliver the coveted "glass skin" effect: luminous, 
              poreless, and deeply hydrated.
            </motion.p>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap justify-center lg:justify-start gap-3"
            >
              {trustBadges.map((badge, index) => (
                <motion.div
                  key={badge.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="glass-card px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <badge.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{badge.label}</div>
                    <div className="text-xs text-muted-foreground">{badge.sublabel}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2"
            >
              <Button variant="hero" size="lg" asChild>
                <Link to="/booking">
                  Book Your Session
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link to="/gallery">See Results</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Side - Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="relative flex justify-center items-center"
          >
            {/* Glow Effect Behind Image */}
            <div className="absolute -inset-4 bg-gradient-to-br from-glow-pink/30 via-glow-rose/20 to-glow-blush/30 rounded-[2rem] blur-2xl" />
            
            {/* Main Image */}
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-[3/4] max-w-md w-full">
              <img
                src={glassSkinPortrait}
                alt="Glass skin facial result - luminous, radiant skin"
                className="w-full h-full object-cover"
              />
              
              {/* Subtle Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-glow-pink/10 via-transparent to-white/5" />

              {/* Floating Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute bottom-6 left-6 right-6 glass-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Premium Experience</div>
                      <div className="text-sm text-muted-foreground">Personalized skincare journey</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">$189 CAD</div>
                    <div className="text-xs text-muted-foreground">per session</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
