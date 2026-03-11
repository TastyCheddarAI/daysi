import { useState } from "react";
import {
  Bot,
  Brain,
  Loader2,
  MessageSquare,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { GenerateModuleContentInput } from "@/lib/daysi-education-api";

interface AiWorkbenchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GenerateModuleContentInput) => void;
  isLoading?: boolean;
}

const providers = [
  {
    value: "openai",
    label: "OpenAI GPT-4",
    description: "Best for comprehensive, structured content",
    icon: Brain,
  },
  {
    value: "kimi",
    label: "Kimi K2.5",
    description: "Excellent for long-form educational content",
    icon: Sparkles,
  },
  {
    value: "xai",
    label: "xAI Grok",
    description: "Great for conversational, engaging content",
    icon: MessageSquare,
  },
  {
    value: "perplexity",
    label: "Perplexity",
    description: "Research-backed, factual content",
    icon: Bot,
  },
];

const categories = [
  { value: "foundations", label: "Foundations" },
  { value: "technical", label: "Technical Skills" },
  { value: "business", label: "Business Operations" },
  { value: "safety", label: "Safety & Compliance" },
  { value: "consulting", label: "Consulting" },
  { value: "marketing", label: "Marketing" },
  { value: "client_care", label: "Client Care" },
  { value: "advanced", label: "Advanced Techniques" },
  { value: "certification", label: "Certification" },
];

const difficulties = [
  { value: "beginner", label: "Beginner", color: "bg-green-100 text-green-800" },
  { value: "intermediate", label: "Intermediate", color: "bg-blue-100 text-blue-800" },
  { value: "advanced", label: "Advanced", color: "bg-orange-100 text-orange-800" },
  { value: "expert", label: "Expert", color: "bg-purple-100 text-purple-800" },
];

const tones = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "academic", label: "Academic" },
  { value: "friendly", label: "Friendly" },
];

export function AiWorkbenchDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AiWorkbenchDialogProps) {
  const [form, setForm] = useState<GenerateModuleContentInput>({
    topic: "",
    category: "foundations",
    difficulty: "beginner",
    targetAudience: "staff",
    lessonCount: 5,
    includeQuizzes: true,
    includeVisuals: true,
    keyLearningObjectives: [],
    tone: "professional",
    provider: "openai",
  });

  const [objectiveInput, setObjectiveInput] = useState("");
  const [referenceInput, setReferenceInput] = useState("");

  const addObjective = () => {
    if (objectiveInput.trim() && form.keyLearningObjectives!.length < 10) {
      setForm((current) => ({
        ...current,
        keyLearningObjectives: [...(current.keyLearningObjectives ?? []), objectiveInput.trim()],
      }));
      setObjectiveInput("");
    }
  };

  const removeObjective = (index: number) => {
    setForm((current) => ({
      ...current,
      keyLearningObjectives: (current.keyLearningObjectives ?? []).filter((_, i) => i !== index),
    }));
  };

  const selectedProvider = providers.find((p) => p.value === form.provider);
  const ProviderIcon = selectedProvider?.icon ?? Sparkles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            AI Content Workbench
          </DialogTitle>
          <DialogDescription>
            Generate comprehensive educational content using our integrated AI system.
            Choose from OpenAI, Kimi, xAI, or Perplexity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="ai-topic">
              Module Topic <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ai-topic"
              placeholder="e.g., Advanced Laser Hair Removal Techniques"
              value={form.topic}
              onChange={(e) => setForm((current) => ({ ...current, topic: e.target.value }))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Be specific for better results. Include the subject and any specific focus areas.
            </p>
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-2">
            <Label>AI Provider</Label>
            <div className="grid grid-cols-2 gap-3">
              {providers.map((provider) => {
                const Icon = provider.icon;
                return (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({ ...current, provider: provider.value as never }))
                    }
                    disabled={isLoading}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      form.provider === provider.value
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                        : "border-border hover:border-purple-200"
                    }`}
                  >
                    <Icon className="h-5 w-5 mt-0.5 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{provider.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {provider.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category & Difficulty */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, category: value as never }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="ai-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-difficulty">Difficulty Level</Label>
              <Select
                value={form.difficulty}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, difficulty: value as never }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="ai-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((diff) => (
                    <SelectItem key={diff.value} value={diff.value}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${diff.color.replace("bg-", "bg-").replace("text-", "")}`} />
                        {diff.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tone & Target Audience */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-tone">Content Tone</Label>
              <Select
                value={form.tone}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, tone: value as never }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="ai-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-audience">Target Audience</Label>
              <Select
                value={form.targetAudience}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, targetAudience: value as never }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="ai-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff/Providers</SelectItem>
                  <SelectItem value="clients">Clients/Customers</SelectItem>
                  <SelectItem value="general">General Audience</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lesson Count Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Number of Lessons: {form.lessonCount}</Label>
              <span className="text-sm text-muted-foreground">
                Estimated: {form.lessonCount! * 15} min total
              </span>
            </div>
            <Slider
              value={[form.lessonCount!]}
              onValueChange={([value]) =>
                setForm((current) => ({ ...current, lessonCount: value }))
              }
              min={1}
              max={15}
              step={1}
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 lesson</span>
              <span>15 lessons</span>
            </div>
          </div>

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Include Quizzes</p>
                <p className="text-xs text-muted-foreground">
                  Add interactive assessments to each lesson
                </p>
              </div>
              <Switch
                checked={form.includeQuizzes}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, includeQuizzes: checked }))
                }
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Include Visuals</p>
                <p className="text-xs text-muted-foreground">
                  Suggest images and diagrams where appropriate
                </p>
              </div>
              <Switch
                checked={form.includeVisuals}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, includeVisuals: checked }))
                }
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="space-y-2">
            <Label>Key Learning Objectives</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a learning objective..."
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addObjective();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addObjective}
                disabled={!objectiveInput.trim() || form.keyLearningObjectives!.length >= 10}
              >
                Add
              </Button>
            </div>
            {form.keyLearningObjectives!.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.keyLearningObjectives!.map((obj, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeObjective(index)}
                  >
                    {obj} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label htmlFor="ai-custom">Custom Instructions (Optional)</Label>
            <Textarea
              id="ai-custom"
              placeholder="Any specific requirements, examples to include, or style preferences..."
              value={form.customPrompt ?? ""}
              onChange={(e) =>
                setForm((current) => ({ ...current, customPrompt: e.target.value }))
              }
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={!form.topic.trim() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ProviderIcon className="h-4 w-4" />
                Generate with {selectedProvider?.label.split(" ")[0]}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
