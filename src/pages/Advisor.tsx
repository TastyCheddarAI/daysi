import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { AdvisorHero } from "@/components/advisor/AdvisorHero";
import { SkinQuiz } from "@/components/advisor/SkinQuiz";
import { FullChatInterface } from "@/components/advisor/FullChatInterface";
import { ConcernGrid } from "@/components/advisor/ConcernGrid";

export type AdvisorMode = "home" | "quiz" | "chat" | "concerns";

export default function Advisor() {
  const [mode, setMode] = useState<AdvisorMode>("home");

  // Scroll to top when mode changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode]);

  return (
    <Layout>
      <SEO
        title="AI Beauty Advisor | Prairie Glow Beauty"
        description="Get personalized skincare and treatment recommendations from our AI Beauty Advisor. Take our skin analysis quiz or chat directly with our AI-powered assistant."
        keywords="AI beauty advisor, skincare recommendations, skin analysis, laser treatments, facial treatments, Niverville spa"
        canonical="/advisor"
      />

      <AnimatePresence mode="wait">
        {mode === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdvisorHero onSelectMode={setMode} />
            <ConcernGrid onConcernClick={() => setMode("chat")} />
          </motion.div>
        )}

        {mode === "quiz" && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <SkinQuiz onBack={() => setMode("home")} onComplete={() => setMode("chat")} />
          </motion.div>
        )}

        {mode === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <FullChatInterface onBack={() => setMode("home")} />
          </motion.div>
        )}

        {mode === "concerns" && (
          <motion.div
            key="concerns"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <ConcernGrid onConcernClick={() => setMode("chat")} />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
