import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useChat } from "@/contexts/ChatContext";

interface SkinQuizProps {
  onBack: () => void;
  onComplete: () => void;
}

interface QuizStep {
  id: string;
  question: string;
  options: { value: string; label: string; description?: string }[];
  multiSelect?: boolean;
}

const quizSteps: QuizStep[] = [
  {
    id: "goal",
    question: "What's your primary beauty goal?",
    options: [
      { value: "hair_removal", label: "Remove unwanted hair", description: "Laser hair removal for smooth, hair-free skin" },
      { value: "skin_texture", label: "Improve skin texture", description: "Address roughness, scars, or uneven skin" },
      { value: "anti_aging", label: "Reduce signs of aging", description: "Minimize wrinkles, fine lines, and sagging" },
      { value: "glow_up", label: "General glow-up", description: "Refresh and rejuvenate my overall appearance" },
    ],
  },
  {
    id: "area",
    question: "Which area would you like to focus on?",
    options: [
      { value: "face", label: "Face only" },
      { value: "body", label: "Body only" },
      { value: "both", label: "Both face and body" },
    ],
  },
  {
    id: "concerns",
    question: "What specific concerns do you have?",
    multiSelect: true,
    options: [
      { value: "dark_spots", label: "Dark spots / Hyperpigmentation" },
      { value: "wrinkles", label: "Fine lines / Wrinkles" },
      { value: "acne", label: "Acne or acne scars" },
      { value: "texture", label: "Uneven texture" },
      { value: "redness", label: "Rosacea / Redness" },
      { value: "pores", label: "Large pores" },
    ],
  },
  {
    id: "experience",
    question: "Have you had professional treatments before?",
    options: [
      { value: "first_time", label: "This would be my first time" },
      { value: "some_experience", label: "I've had a few treatments" },
      { value: "regular", label: "I get regular treatments" },
    ],
  },
  {
    id: "timeline",
    question: "What's your timeline and budget preference?",
    options: [
      { value: "event", label: "Preparing for an event (1-3 months)" },
      { value: "maintenance", label: "Looking for ongoing maintenance" },
      { value: "exploring", label: "Just exploring options for now" },
    ],
  },
];

export function SkinQuiz({ onBack, onComplete }: SkinQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const { addMessage } = useChat();

  const step = quizSteps[currentStep];
  const progress = ((currentStep + 1) / quizSteps.length) * 100;
  const isLastStep = currentStep === quizSteps.length - 1;

  const handleSelect = (value: string) => {
    if (step.multiSelect) {
      const current = (answers[step.id] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [step.id]: updated });
    } else {
      setAnswers({ ...answers, [step.id]: value });
      // Auto-advance for single select
      if (!isLastStep) {
        setTimeout(() => setCurrentStep(currentStep + 1), 300);
      }
    }
  };

  const isSelected = (value: string) => {
    const answer = answers[step.id];
    if (Array.isArray(answer)) return answer.includes(value);
    return answer === value;
  };

  const canProceed = () => {
    const answer = answers[step.id];
    if (Array.isArray(answer)) return answer.length > 0;
    return !!answer;
  };

  const handleComplete = () => {
    // Generate a summary message for the AI
    const goalLabel = quizSteps[0].options.find(o => o.value === answers.goal)?.label || "";
    const areaLabel = quizSteps[1].options.find(o => o.value === answers.area)?.label || "";
    const concerns = (answers.concerns as string[])?.map(c => 
      quizSteps[2].options.find(o => o.value === c)?.label
    ).join(", ") || "general skincare";
    const experience = quizSteps[3].options.find(o => o.value === answers.experience)?.label || "";
    const timeline = quizSteps[4].options.find(o => o.value === answers.timeline)?.label || "";

    const summaryMessage = `Hi! I just completed the skin analysis quiz. Here are my answers:
- Primary goal: ${goalLabel}
- Focus area: ${areaLabel}
- Specific concerns: ${concerns}
- Experience level: ${experience}
- Timeline: ${timeline}

Based on this, what treatments would you recommend for me?`;

    // Add the summary as a user message to seed the chat
    addMessage({ role: "user", content: summaryMessage });
    
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-16">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {quizSteps.length}
          </span>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-2 mb-12" />

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {step.question}
            </h2>

            <div className="space-y-3">
              {step.options.map((option, idx) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    isSelected(option.value)
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected(option.value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected(option.value) && (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-12">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={!canProceed()}
              className="gap-2"
            >
              See My Results
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            step.multiSelect && (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
