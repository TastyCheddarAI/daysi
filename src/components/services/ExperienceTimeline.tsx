import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface TimelineStep {
  icon: LucideIcon;
  title: string;
  description: string;
  duration?: string;
}

interface ExperienceTimelineProps {
  title: string;
  subtitle: string;
  steps: TimelineStep[];
}

export function ExperienceTimeline({
  title,
  subtitle,
  steps,
}: ExperienceTimelineProps) {
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
        
        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-glow-rose/50 to-primary/50 -translate-x-1/2" />
            
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={`relative flex items-start gap-6 md:gap-12 mb-12 last:mb-0 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Icon Circle */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-glow-rose flex items-center justify-center shadow-lg z-10">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content Card */}
                <div
                  className={`ml-20 md:ml-0 md:w-[calc(50%-3rem)] p-6 rounded-2xl bg-secondary/50 border border-border/50 ${
                    index % 2 === 0 ? "md:text-right" : "md:text-left"
                  }`}
                >
                  {step.duration && (
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                      {step.duration}
                    </span>
                  )}
                  <h3 className="font-serif text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
