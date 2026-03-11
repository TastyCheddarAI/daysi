import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ContentSection {
  icon: LucideIcon;
  number: string;
  title: string;
  paragraphs: string[];
  highlight?: {
    value: string;
    label: string;
  };
  keyTakeaway?: string;
}

interface ContentShowcaseProps {
  title: string;
  subtitle: string;
  sections: ContentSection[];
}

export function ContentShowcase({ title, subtitle, sections }: ContentShowcaseProps) {
  return (
    <section className="py-16 lg:py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl translate-y-1/2" />
      
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            {subtitle}
          </p>
        </motion.div>

        {/* Content Sections */}
        <div className="max-w-6xl mx-auto space-y-12 lg:space-y-20">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isReversed = index % 2 === 1;
            
            return (
              <motion.div
                key={section.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`grid lg:grid-cols-12 gap-6 lg:gap-10 items-start ${isReversed ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* Number and Icon Badge */}
                <div className={`lg:col-span-1 flex lg:flex-col items-center gap-3 ${isReversed ? 'lg:order-last' : ''}`}>
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
                  >
                    <span className="text-sm font-bold text-primary">{section.number}</span>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", delay: 0.3 }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                  </motion.div>
                </div>

                {/* Content */}
                <div className={`lg:col-span-7 ${isReversed ? 'lg:order-first' : ''}`}>
                  <motion.h3
                    initial={{ opacity: 0, x: isReversed ? 20 : -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4 relative"
                  >
                    {section.title}
                    <span className="absolute -bottom-2 left-0 w-16 h-0.5 bg-gradient-to-r from-primary to-transparent" />
                  </motion.h3>
                  
                  <div className="space-y-4 mt-6">
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <motion.p
                        key={pIndex}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + pIndex * 0.1 }}
                        className="text-foreground/75 leading-relaxed"
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </div>

                  {/* Key Takeaway */}
                  {section.keyTakeaway && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 }}
                      className="mt-6 p-4 bg-muted/50 border-l-4 border-primary/40 rounded-r-lg"
                    >
                      <p className="text-sm text-foreground/80 italic">
                        💡 {section.keyTakeaway}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Highlight Card */}
                <div className={`lg:col-span-4 ${isReversed ? '' : ''}`}>
                  {section.highlight && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: isReversed ? -20 : 20 }}
                      whileInView={{ opacity: 1, scale: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", delay: 0.4 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
                      <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg">
                        <div className="text-center">
                          <motion.span
                            initial={{ scale: 0.5 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", delay: 0.5 }}
                            className="block text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent mb-2"
                          >
                            {section.highlight.value}
                          </motion.span>
                          <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                            {section.highlight.label}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
