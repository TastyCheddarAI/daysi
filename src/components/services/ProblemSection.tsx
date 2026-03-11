import { motion } from "framer-motion";
import { LucideIcon, XCircle, CheckCircle } from "lucide-react";

interface PainPoint {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ProblemSectionProps {
  headline: string;
  subheadline: string;
  painPoints: PainPoint[];
  solutionTitle: string;
  solutionDescription: string;
}

export function ProblemSection({
  headline,
  subheadline,
  painPoints,
  solutionTitle,
  solutionDescription,
}: ProblemSectionProps) {
  return (
    <section className="py-20 lg:py-28 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--secondary))_0%,transparent_50%)]" />
      
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
            {headline}
          </h2>
          <p className="text-lg text-muted-foreground">{subheadline}</p>
        </motion.div>
        
        {/* Pain Points Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {painPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-2xl bg-secondary/50 border border-border/50 hover:border-destructive/30 hover:bg-destructive/5 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                  <XCircle className="w-5 h-5" />
                </div>
                <point.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {point.description}
              </p>
            </motion.div>
          ))}
        </div>
        
        {/* Solution Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-glow-rose to-glow-pink" />
          <div className="relative p-8 md:p-12 text-white">
            <div className="flex items-start gap-4 max-w-4xl">
              <div className="shrink-0 p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-2xl md:text-3xl font-semibold mb-3">
                  {solutionTitle}
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  {solutionDescription}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
