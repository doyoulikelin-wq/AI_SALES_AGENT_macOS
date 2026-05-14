import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import type { AgentDecision } from "../types.js";

export interface LlmClient {
  decide(systemPrompt: string, userPrompt: string): Promise<AgentDecision>;
}

export function createLlmClient(config: AppConfig, logger: Logger): LlmClient {
  if (config.llm.provider === "openai") return new OpenAiCompatibleClient(config, logger);
  if (config.llm.provider === "gemini") return new GeminiClient(config, logger);
  return new StubClient();
}

class OpenAiCompatibleClient implements LlmClient {
  constructor(private readonly config: AppConfig, private readonly logger: Logger) {}

  async decide(systemPrompt: string, userPrompt: string): Promise<AgentDecision> {
    const endpoint = `${this.config.llm.openaiBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.llm.openaiApiKey}`
      },
      body: JSON.stringify({
        model: this.config.llm.openaiModel,
        temperature: this.config.llm.temperature,
        max_tokens: this.config.llm.maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const body = await response.text();
    if (!response.ok) {
      this.logger.warn("openai-compatible request failed", { status: response.status, body: body.slice(0, 500) });
      throw new Error(`LLM request failed with HTTP ${response.status}`);
    }

    const data = JSON.parse(body) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? "";
    return parseDecision(text);
  }
}

class GeminiClient implements LlmClient {
  constructor(private readonly config: AppConfig, private readonly logger: Logger) {}

  async decide(systemPrompt: string, userPrompt: string): Promise<AgentDecision> {
    const model = encodeURIComponent(this.config.llm.geminiModel);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.config.llm.geminiApiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: this.config.llm.temperature,
          maxOutputTokens: this.config.llm.maxTokens
        }
      })
    });

    const body = await response.text();
    if (!response.ok) {
      this.logger.warn("gemini request failed", { status: response.status, body: body.slice(0, 500) });
      throw new Error(`Gemini request failed with HTTP ${response.status}`);
    }

    const data = JSON.parse(body) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    return parseDecision(text);
  }
}

class StubClient implements LlmClient {
  async decide(): Promise<AgentDecision> {
    return {
      reply: "Thanks for your inquiry. Could you share the product, quantity, destination country, packaging requirement, and your WhatsApp or email? I will help prepare the next step for you.",
      needsHuman: false,
      reason: "stub mode qualification reply",
      risk: "none",
      language: "en",
      salesStage: "qualification",
      nextAction: "collect inquiry details",
      approvalType: "none",
      customerSummary: "New customer inquiry needs qualification."
    };
  }
}

function parseDecision(text: string): AgentDecision {
  const jsonText = extractJson(text);
  if (!jsonText) return fallbackDecision("LLM did not return JSON.");

  try {
    const parsed = JSON.parse(jsonText) as Partial<AgentDecision>;
    return {
      reply: nonEmpty(parsed.reply, "I will check this with our manager and get back to you shortly."),
      needsHuman: Boolean(parsed.needsHuman),
      reason: nonEmpty(parsed.reason, "model decision"),
      risk: nonEmpty(parsed.risk, "none"),
      language: nonEmpty(parsed.language, "en"),
      salesStage: nonEmpty(parsed.salesStage, "qualification"),
      nextAction: nonEmpty(parsed.nextAction, "continue qualification"),
      approvalType: parsed.approvalType ?? "none",
      customerSummary: nonEmpty(parsed.customerSummary, "Customer inquiry received.")
    };
  } catch {
    return fallbackDecision("LLM JSON could not be parsed.");
  }
}

function extractJson(text: string): string | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return text.slice(start, end + 1);
}

function nonEmpty(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function fallbackDecision(reason: string): AgentDecision {
  return {
    reply: "I will check this with our manager and get back to you shortly.",
    needsHuman: true,
    reason,
    risk: "unsupported",
    language: "en",
    salesStage: "qualification",
    nextAction: "human review",
    approvalType: "other",
    customerSummary: "The model response needs human review."
  };
}
