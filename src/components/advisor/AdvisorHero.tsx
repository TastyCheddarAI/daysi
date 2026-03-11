import { motion } from "framer-motion";
import { MessageCircle, ClipboardList, Zap } from "lucide-react";
import type { AdvisorMode } from "@/pages/Advisor";

interface AdvisorHeroProps {
  onSelectMode: (mode: AdvisorMode) => void;
}

export function AdvisorHero({ onSelectMode }: AdvisorHeroProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Your Personal
              <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Beauty Advisor
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Get personalized treatment recommendations powered by AI. Take our skin quiz, 
              chat with our advisor, or explore solutions for your specific concerns.
            </p>
          </motion.div>

          {/* Mode selection cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {/* Quiz Card */}
            <motion.button
              onClick={() => onSelectMode("quiz")}
              className="group relative p-6 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Skin Analysis Quiz</h3>
              <p className="text-sm text-muted-foreground">
                Answer 5 quick questions to get personalized recommendations
              </p>
              <div className="mt-4 text-xs text-primary font-medium">
                2-3 minutes →
              </div>
            </motion.button>

            {/* Chat Card */}
            <motion.button
              onClick={() => onSelectMode("chat")}
              className="group relative p-6 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Chat with AI</h3>
              <p className="text-sm text-muted-foreground">
                Ask anything about treatments, pricing, or skincare tips
              </p>
              <div className="mt-4 text-xs text-primary font-medium">
                Instant answers →
              </div>
            </motion.button>

            {/* Quick Concerns Card */}
            <motion.button
              onClick={() => onSelectMode("concerns")}
              className="group relative p-6 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quick Solutions</h3>
              <p className="text-sm text-muted-foreground">
                Browse treatments by your specific skin concern
              </p>
              <div className="mt-4 text-xs text-primary font-medium">
                Explore now →
              </div>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
