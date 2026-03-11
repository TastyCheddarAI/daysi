import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface TreatmentArea {
  icon: LucideIcon;
  name: string;
  description: string;
  duration?: string;
  sessions?: string;
  popular?: boolean;
}

interface TreatmentAreasProps {
  title: string;
  subtitle: string;
  areas: TreatmentArea[];
  ctaText?: string;
  ctaHref?: string;
}

export function TreatmentAreas({
  title,
  subtitle,
  areas,
  ctaText = "View Full Pricing",
  ctaHref = "/pricing",
}: TreatmentAreasProps) {
  const [selectedArea, setSelectedArea] = useState<number | null>(null);

  return (
    <section className="py-20 lg:py-28 bg-background relative overflow-hidden">
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
            {title}
          </h2>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        </motion.div>
        
        {/* Areas Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {areas.map((area, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <button
                onClick={() => setSelectedArea(selectedArea === index ? null : index)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                  selectedArea === index
                    ? "bg-primary/5 border-primary shadow-lg"
                    : "bg-secondary/30 border-border/50 hover:border-primary/30 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        selectedArea === index
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <area.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{area.name}</h3>
                        {area.popular && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-glow-rose/20 text-glow-rose font-medium">
                            Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      selectedArea === index ? "rotate-90" : ""
                    }`}
                  />
                </div>
                
                <AnimatePresence>
                  {selectedArea === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 pt-4 border-t border-border/50"
                    >
                      <p className="text-sm text-muted-foreground mb-3">
                        {area.description}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {area.duration && (
                          <span className="px-2 py-1 rounded-md bg-background border border-border">
                            ⏱ {area.duration}
                          </span>
                        )}
                        {area.sessions && (
                          <span className="px-2 py-1 rounded-md bg-background border border-border">
                            📅 {area.sessions}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <Button variant="hero" size="lg" asChild>
            <Link to={ctaHref}>{ctaText}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
