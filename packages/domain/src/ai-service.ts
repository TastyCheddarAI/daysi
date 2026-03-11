import type {
  AiGeneratedModuleContent,
  AiProvider,
  GenerateModuleContentInput,
  LessonContentBlock,
} from "./education";

export interface AiServiceConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AiProvider;
}

export interface AiService {
  generateModuleContent(
    input: GenerateModuleContentInput,
  ): Promise<AiServiceResponse<AiGeneratedModuleContent>>;
  regenerateLessonContent(input: {
    moduleTitle: string;
    lessonTitle: string;
    currentContent: LessonContentBlock[];
    customInstructions?: string;
  }): Promise<AiServiceResponse<LessonContentBlock[]>>;
  expandContent(input: {
    content: string;
    expansionType: "examples" | "detail" | "simplification";
  }): Promise<AiServiceResponse<string>>;
}

// Provider-specific implementations
export class OpenAiService implements AiService {
  private config: AiServiceConfig;

  constructor(config: AiServiceConfig) {
    this.config = {
      model: "gpt-4-turbo-preview",
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };
  }

  async generateModuleContent(
    input: GenerateModuleContentInput,
  ): Promise<AiServiceResponse<AiGeneratedModuleContent>> {
    const prompt = buildModuleGenerationPrompt(input);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert educational content creator specializing in beauty, wellness, and medical spa education. Create comprehensive, professional training modules.",
            },
            { role: "user", content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${error}`,
          model: this.config.model!,
          provider: "openai",
        };
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: "No content generated",
          model: this.config.model!,
          provider: "openai",
        };
      }

      const parsed = JSON.parse(content) as AiGeneratedModuleContent;

      return {
        success: true,
        data: parsed,
        usage: {
          promptTokens: result.usage?.prompt_tokens ?? 0,
          completionTokens: result.usage?.completion_tokens ?? 0,
          totalTokens: result.usage?.total_tokens ?? 0,
        },
        model: this.config.model!,
        provider: "openai",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: this.config.model!,
        provider: "openai",
      };
    }
  }

  async regenerateLessonContent(input: {
    moduleTitle: string;
    lessonTitle: string;
    currentContent: LessonContentBlock[];
    customInstructions?: string;
  }): Promise<AiServiceResponse<LessonContentBlock[]>> {
    const prompt = buildLessonRegenerationPrompt(input);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert educational content editor. Improve and regenerate lesson content while maintaining structure.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenAI API error: ${await response.text()}`,
          model: this.config.model!,
          provider: "openai",
        };
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: "No content generated",
          model: this.config.model!,
          provider: "openai",
        };
      }

      const parsed = JSON.parse(content);

      return {
        success: true,
        data: parsed.content as LessonContentBlock[],
        usage: {
          promptTokens: result.usage?.prompt_tokens ?? 0,
          completionTokens: result.usage?.completion_tokens ?? 0,
          totalTokens: result.usage?.total_tokens ?? 0,
        },
        model: this.config.model!,
        provider: "openai",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: this.config.model!,
        provider: "openai",
      };
    }
  }

  async expandContent(input: {
    content: string;
    expansionType: "examples" | "detail" | "simplification";
  }): Promise<AiServiceResponse<string>> {
    const prompts = {
      examples: "Expand this content with practical, real-world examples:",
      detail: "Expand this content with more technical detail and depth:",
      simplification: "Simplify this content to make it more accessible:",
    };

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content: "You are an expert content editor specializing in educational materials.",
            },
            {
              role: "user",
              content: `${prompts[input.expansionType]}\n\n${input.content}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenAI API error: ${await response.text()}`,
          model: this.config.model!,
          provider: "openai",
        };
      }

      const result = await response.json();

      return {
        success: true,
        data: result.choices[0]?.message?.content ?? "",
        usage: {
          promptTokens: result.usage?.prompt_tokens ?? 0,
          completionTokens: result.usage?.completion_tokens ?? 0,
          totalTokens: result.usage?.total_tokens ?? 0,
        },
        model: this.config.model!,
        provider: "openai",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: this.config.model!,
        provider: "openai",
      };
    }
  }
}

// xAI (Grok) Service
export class XAiService implements AiService {
  private config: AiServiceConfig;

  constructor(config: AiServiceConfig) {
    this.config = {
      model: "grok-2-1212",
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };
  }

  async generateModuleContent(
    input: GenerateModuleContentInput,
  ): Promise<AiServiceResponse<AiGeneratedModuleContent>> {
    const prompt = buildModuleGenerationPrompt(input);

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert educational content creator specializing in beauty, wellness, and medical spa education.",
            },
            { role: "user", content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `xAI API error: ${await response.text()}`,
          model: this.config.model!,
          provider: "xai",
        };
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      // Extract JSON from response
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: "Could not parse JSON from response",
          model: this.config.model!,
          provider: "xai",
        };
      }

      const parsed = JSON.parse(jsonMatch[0]) as AiGeneratedModuleContent;

      return {
        success: true,
        data: parsed,
        usage: {
          promptTokens: result.usage?.prompt_tokens ?? 0,
          completionTokens: result.usage?.completion_tokens ?? 0,
          totalTokens: result.usage?.total_tokens ?? 0,
        },
        model: this.config.model!,
        provider: "xai",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: this.config.model!,
        provider: "xai",
      };
    }
  }

  async regenerateLessonContent(): Promise<AiServiceResponse<LessonContentBlock[]>> {
    return {
      success: false,
      error: "Not implemented for xAI",
      model: this.config.model!,
      provider: "xai",
    };
  }

  async expandContent(): Promise<AiServiceResponse<string>> {
    return {
      success: false,
      error: "Not implemented for xAI",
      model: this.config.model!,
      provider: "xai",
    };
  }
}

// Perplexity Service
export class PerplexityService implements AiService {
  private config: AiServiceConfig;

  constructor(config: AiServiceConfig) {
    this.config = {
      model: "sonar-pro",
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };
  }

  async generateModuleContent(
    input: GenerateModuleContentInput,
  ): Promise<AiServiceResponse<AiGeneratedModuleContent>> {
    const prompt = buildModuleGenerationPrompt(input);

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert educational content creator. Use your search capabilities to include current, accurate information.",
            },
            { role: "user", content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Perplexity API error: ${await response.text()}`,
          model: this.config.model!,
          provider: "perplexity",
        };
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      // Extract JSON
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: "Could not parse JSON from response",
          model: this.config.model!,
          provider: "perplexity",
        };
      }

      const parsed = JSON.parse(jsonMatch[0]) as AiGeneratedModuleContent;

      return {
        success: true,
        data: parsed,
        usage: {
          promptTokens: result.usage?.prompt_tokens ?? 0,
          completionTokens: result.usage?.completion_tokens ?? 0,
          totalTokens: result.usage?.total_tokens ?? 0,
        },
        model: this.config.model!,
        provider: "perplexity",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: this.config.model!,
        provider: "perplexity",
      };
    }
  }

  async regenerateLessonContent(): Promise<AiServiceResponse<LessonContentBlock[]>> {
    return {
      success: false,
      error: "Not implemented for Perplexity",
      model: this.config.model!,
      provider: "perplexity",
    };
  }

  async expandContent(): Promise<AiServiceResponse<string>> {
    return {
      success: false,
      error: "Not implemented for Perplexity",
      model: this.config.model!,
      provider: "perplexity",
    };
  }
}

// Kimi (Moonshot) Service
export class KimiService implements AiService {
  private config: AiServiceConfig;

  constructor(config: AiServiceConfig) {
    this.config = {
      model: "kimi-k2.5",
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };
  }

  async generateModuleContent(
    input: GenerateModuleContentInput,
  ): Promise<AiServiceResponse<AiGeneratedModuleContent>> {
    const prompt = buildModuleGenerationPrompt(input);

    try {
      const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert educational content creator specializing in beauty, wellness, and medical spa education.",
            },
            { role: "user", content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Kimi API error: ${await response.text()}`,
          model: this.config.model!,
          provider: "kimi",
        };
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: "No content generated",
          model: this.config.model!,
          provider: "kimi",
        };
      }

      const parsed = JSON.parse(content) as AiGeneratedModuleContent;

      return {
        success: true,
        data: parsed,
        usage: {
          promptTokens: result.usage?.prompt_tokens ?? 0,
          completionTokens: result.usage?.completion_tokens ?? 0,
          totalTokens: result.usage?.total_tokens ?? 0,
        },
        model: this.config.model!,
        provider: "kimi",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: this.config.model!,
        provider: "kimi",
      };
    }
  }

  async regenerateLessonContent(): Promise<AiServiceResponse<LessonContentBlock[]>> {
    return {
      success: false,
      error: "Not implemented for Kimi",
      model: this.config.model!,
      provider: "kimi",
    };
  }

  async expandContent(): Promise<AiServiceResponse<string>> {
    return {
      success: false,
      error: "Not implemented for Kimi",
      model: this.config.model!,
      provider: "kimi",
    };
  }
}

// AI Service Factory
export const createAiService = (
  provider: AiProvider,
  apiKey: string,
): AiService => {
  const config: AiServiceConfig = { provider, apiKey };

  switch (provider) {
    case "openai":
      return new OpenAiService(config);
    case "xai":
      return new XAiService(config);
    case "perplexity":
      return new PerplexityService(config);
    case "kimi":
      return new KimiService(config);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
};

// Prompt builders (internal)
function buildModuleGenerationPrompt(input: GenerateModuleContentInput): string {
  const objectivesSection =
    input.keyLearningObjectives.length > 0
      ? `Key Learning Objectives:\n${input.keyLearningObjectives.map((obj) => `- ${obj}`).join("\n")}\n\n`
      : "";

  const referenceSection =
    input.referenceMaterials && input.referenceMaterials.length > 0
      ? `Reference Materials:\n${input.referenceMaterials.map((ref) => `- ${ref}`).join("\n")}\n\n`
      : "";

  const quizInstruction = input.includeQuizzes
    ? "Each lesson should include an interactive quiz section with 2-4 multiple choice questions to reinforce learning.\n"
    : "";

  return `Create a comprehensive educational module on "${input.topic}".

Target Audience: ${input.targetAudience === "staff" ? "Beauty/Medical Spa Staff" : input.targetAudience === "clients" ? "Clients/Customers" : "General Audience"}
Difficulty Level: ${input.difficulty}
Category: ${input.category}
Number of Lessons: ${input.lessonCount}
Tone: ${input.tone}

${objectivesSection}${referenceSection}
Requirements:
- Create ${input.lessonCount} structured lessons with clear progression
- Each lesson should be 10-20 minutes of reading time
- Include practical, actionable content
${quizInstruction}
- Include real-world examples and scenarios
- Use professional but ${input.tone} language
- Make content engaging and memorable

Output Format (JSON):
{
  "title": "Module title",
  "description": "Detailed module description (2-3 paragraphs)",
  "shortDescription": "Brief summary (1-2 sentences)",
  "estimatedDurationMinutes": total estimated time,
  "learningObjectives": ["objective 1", "objective 2", ...],
  "prerequisites": ["prerequisite 1", ...],
  "tags": ["tag1", "tag2", ...],
  "lessons": [
    {
      "slug": "lesson-url-slug",
      "title": "Lesson Title",
      "description": "Lesson description",
      "durationMinutes": estimated minutes,
      "content": [
        {"type": "heading", "level": 1, "content": "Heading text"},
        {"type": "text", "content": "Paragraph text"},
        {"type": "list", "style": "bullet", "items": ["item 1", "item 2"]},
        {"type": "callout", "variant": "tip|info|warning|success", "title": "Optional title", "content": "Callout content"},
        {"type": "quiz", "question": "Question text", "options": ["A", "B", "C", "D"], "correctOptionIndex": 0, "explanation": "Why this is correct"}
      ]
    }
  ]
}`;
}

function buildLessonRegenerationPrompt(input: {
  moduleTitle: string;
  lessonTitle: string;
  currentContent: LessonContentBlock[];
  customInstructions?: string;
}): string {
  const currentContentSummary = input.currentContent
    .map((block) => {
      if (block.type === "text") return `Text: ${block.content.slice(0, 100)}...`;
      if (block.type === "heading") return `Heading: ${block.content}`;
      if (block.type === "list") return `List (${block.style}): ${block.items.length} items`;
      if (block.type === "quiz") return `Quiz: ${block.question}`;
      return `${block.type}: content`;
    })
    .join("\n");

  return `Regenerate content for the lesson "${input.lessonTitle}" in the module "${input.moduleTitle}".

Current Content Summary:
${currentContentSummary}

${input.customInstructions ? `Custom Instructions: ${input.customInstructions}\n\n` : ""}
Requirements:
- Maintain the same learning objectives and structure
- Improve clarity and engagement
- Add more practical examples
- Ensure professional tone

Output the regenerated content using the same JSON format as the original lesson.`;
}
