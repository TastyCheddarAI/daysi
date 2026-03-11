import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

interface TechnologyShowcaseProps {
  title: string;
  subtitle: string;
  technologyName: string;
  technologyDescription: string;
  steps: Step[];
  certifications?: string[];
}

export function TechnologyShowcase({
  title,
  subtitle,
  technologyName,
  technologyDescription,
  steps,
  certifications,
}: TechnologyShowcaseProps) {
  return (
    <section className="py-20 lg:py-28 bg-secondary/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-glow-blush/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-glow-rose/15 rounded-full blur-3xl" />
      
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
        
        {/* Technology Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-16 p-8 rounded-3xl bg-background border border-border/50 shadow-xl"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-glow-rose flex items-center justify-center">
              <span className="text-white font-serif text-2xl font-bold">SL</span>
            </div>
            <div>
              <h3 className="font-serif text-2xl font-semibold mb-2">{technologyName}</h3>
              <p className="text-muted-foreground leading-relaxed">{technologyDescription}</p>
            </div>
          </div>
        </motion.div>
        
        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-glow-rose/10 border border-primary/20 mb-6 group hover:from-primary hover:to-glow-rose transition-all duration-500">
                  <step.icon className="w-10 h-10 text-primary group-hover:text-white transition-colors" />
                </div>
                <div className="text-sm font-semibold text-primary mb-2">Step {step.number}</div>
                <h4 className="font-serif text-xl font-semibold mb-3">{step.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {certifications.map((cert, index) => (
              <span
                key={index}
                className="px-4 py-2 rounded-full bg-background border border-border text-sm text-muted-foreground"
              >
                {cert}
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
