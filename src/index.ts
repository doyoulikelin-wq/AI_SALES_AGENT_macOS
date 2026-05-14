import { SalesAgent } from "./agent/sales-agent.js";
import { TelegramBot } from "./channels/telegram-bot.js";
import { loadConfig } from "./config.js";
import { buildServer } from "./http/server.js";
import { createLlmClient } from "./llm/llm-client.js";
import { Logger } from "./logger.js";
import { JsonlStore } from "./store/jsonl-store.js";

const config = loadConfig();
const logger = new Logger(config.logLevel);

process.on("unhandledRejection", (reason) => {
  logger.error("unhandled rejection", { reason: reason instanceof Error ? reason.message : String(reason) });
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught exception", { error: error.message });
  process.exitCode = 1;
});

const store = new JsonlStore(config.dataDir, logger);
await store.init();

const llm = createLlmClient(config, logger);
const agent = new SalesAgent(config, store, llm, logger);
await agent.init();

const telegram = new TelegramBot(config, agent, store, logger);
agent.setOperatorNotifier(telegram);

const server = await buildServer(config, agent, store, logger);
await server.listen({ port: config.port, host: "0.0.0.0" });
logger.info("http server started", { port: config.port });

await telegram.start();

async function shutdown(signal: string): Promise<void> {
  logger.info("shutdown requested", { signal });
  await telegram.stop(signal);
  await server.close();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
