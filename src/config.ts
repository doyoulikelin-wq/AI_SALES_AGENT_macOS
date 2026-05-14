import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  DATA_DIR: z.string().default("./data"),
  PROMPT_PATH: z.string().default("./prompts/sales-agent-system.md"),
  LLM_PROVIDER: z.enum(["openai", "gemini", "stub"]).default("stub"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  TEMPERATURE: z.coerce.number().min(0).max(1).default(0.3),
  MAX_TOKENS: z.coerce.number().int().positive().default(1200),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_OPERATOR_CHAT_ID: z.string().optional().default(""),
  CUSTOMER_TELEGRAM_ENABLED: z.coerce.boolean().default(true),
  REQUIRE_PRICE_APPROVAL: z.coerce.boolean().default(true),
  PUBLIC_DISCOUNT_LIMIT: z.coerce.number().min(0).default(0),
  DEFAULT_CURRENCY: z.string().default("USD"),
  COMPANY_SITE_URL: z.string().default("https://herbaloem.com/"),
  APPROVAL_SLA_HOURS: z.coerce.number().int().positive().default(4),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  const env = envSchema.parse(process.env);
  const hasOpenAiKey = env.OPENAI_API_KEY.length > 0;
  const hasGeminiKey = env.GEMINI_API_KEY.length > 0;
  const provider = env.LLM_PROVIDER === "openai" && !hasOpenAiKey
    ? "stub"
    : env.LLM_PROVIDER === "gemini" && !hasGeminiKey
      ? "stub"
      : env.LLM_PROVIDER;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    dataDir: env.DATA_DIR,
    promptPath: env.PROMPT_PATH,
    logLevel: env.LOG_LEVEL,
    llm: {
      provider,
      openaiApiKey: env.OPENAI_API_KEY,
      openaiBaseUrl: env.OPENAI_BASE_URL,
      openaiModel: env.OPENAI_MODEL,
      geminiApiKey: env.GEMINI_API_KEY,
      geminiModel: env.GEMINI_MODEL,
      temperature: env.TEMPERATURE,
      maxTokens: env.MAX_TOKENS
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN,
      operatorChatId: env.TELEGRAM_OPERATOR_CHAT_ID,
      customerTelegramEnabled: env.CUSTOMER_TELEGRAM_ENABLED
    },
    sales: {
      requirePriceApproval: env.REQUIRE_PRICE_APPROVAL,
      publicDiscountLimit: env.PUBLIC_DISCOUNT_LIMIT,
      defaultCurrency: env.DEFAULT_CURRENCY,
      companySiteUrl: env.COMPANY_SITE_URL,
      approvalSlaHours: env.APPROVAL_SLA_HOURS
    }
  };
}
