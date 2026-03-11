import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const suggestions = [
  "What treatments do you offer?",
  "How much is laser hair removal?",
  "Do you have any packages?",
  "Where are you located?",
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-xs text-muted-foreground">Quick questions</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((question, index) => (
          <motion.div
            key={question}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(question)}
              disabled={disabled}
              className="text-xs h-auto py-1.5 px-3 whitespace-normal text-left"
            >
              {question}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
