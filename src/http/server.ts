import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import type { SalesAgent } from "../agent/sales-agent.js";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import type { JsonlStore } from "../store/jsonl-store.js";
import type { Approval, MessageRecord, Session } from "../types.js";
import { renderAdminPage } from "./admin-page.js";

interface DashboardStats {
  totals: {
    sessionsAll: number;
    sessionsActive: number;
    approvalsAll: number;
    approvalsPending: number;
    messages: number;
  };
  sessionStatus: Record<string, number>;
  channels: Record<string, number>;
  approvalStatus: Record<string, number>;
  approvalTypes: Record<string, number>;
  riskTypes: Record<string, number>;
  messageRoles: Record<string, number>;
  messagesPerHour: Array<{ bucket: string; count: number }>;
  approvalsPerHour: Array<{ bucket: string; count: number }>;
  oldestPendingApprovalMinutes: number | null;
}

function bumpCount(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function hourBucket(iso: string): string {
  return iso.slice(0, 13) + ":00";
}

function buildStats(store: JsonlStore): DashboardStats {
  const sessions = store.listAllSessions(1000);
  const approvals = store.listAllApprovals(1000);

  const sessionStatus: Record<string, number> = {};
  const channels: Record<string, number> = {};
  for (const s of sessions) {
    bumpCount(sessionStatus, s.status);
    bumpCount(channels, s.channel);
  }

  const approvalStatus: Record<string, number> = {};
  const approvalTypes: Record<string, number> = {};
  const riskTypes: Record<string, number> = {};
  const approvalsPerHourMap = new Map<string, number>();
  let oldestPendingMs: number | null = null;
  const now = Date.now();
  for (const a of approvals) {
    bumpCount(approvalStatus, a.status);
    bumpCount(approvalTypes, a.type);
    bumpCount(riskTypes, a.risk || "none");
    const bucket = hourBucket(a.requestedAt);
    approvalsPerHourMap.set(bucket, (approvalsPerHourMap.get(bucket) ?? 0) + 1);
    if (a.status === "pending") {
      const age = now - new Date(a.requestedAt).getTime();
      if (oldestPendingMs === null || age > oldestPendingMs) oldestPendingMs = age;
    }
  }

  const messagesPerHourMap = new Map<string, number>();
  const messageRoles: Record<string, number> = {};
  let messageTotal = 0;
  for (const session of sessions) {
    for (const m of store.listAllMessages(session.id)) {
      messageTotal++;
      bumpCount(messageRoles, m.role);
      const bucket = hourBucket(m.createdAt);
      messagesPerHourMap.set(bucket, (messagesPerHourMap.get(bucket) ?? 0) + 1);
    }
  }

  const sortBuckets = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-24)
      .map(([bucket, count]) => ({ bucket, count }));

  return {
    totals: {
      sessionsAll: sessions.length,
      sessionsActive: sessions.filter((s) => s.status !== "closed").length,
      approvalsAll: approvals.length,
      approvalsPending: approvals.filter((a) => a.status === "pending").length,
      messages: messageTotal
    },
    sessionStatus,
    channels,
    approvalStatus,
    approvalTypes,
    riskTypes,
    messageRoles,
    messagesPerHour: sortBuckets(messagesPerHourMap),
    approvalsPerHour: sortBuckets(approvalsPerHourMap),
    oldestPendingApprovalMinutes: oldestPendingMs === null ? null : Math.round(oldestPendingMs / 60000)
  };
}

function decorateSession(session: Session, store: JsonlStore): Session & { messageCount: number; pendingApproval?: Approval } {
  const pending = session.pendingApprovalId ? store.getApproval(session.pendingApprovalId) : undefined;
  return {
    ...session,
    messageCount: store.listAllMessages(session.id).length,
    pendingApproval: pending
  };
}

export async function buildServer(config: AppConfig, agent: SalesAgent, store: JsonlStore, logger: Logger) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    ok: true,
    nodeEnv: config.nodeEnv,
    llmProvider: config.llm.provider,
    activeSessions: store.listActiveSessions(100).length,
    pendingApprovals: store.listPendingApprovals(100).length
  }));

  app.get("/sessions", async () => ({ sessions: store.listActiveSessions(50) }));
  app.get("/approvals", async () => ({ approvals: store.listPendingApprovals(50) }));

  // ---------- Admin dashboard ----------
  app.get("/admin", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(renderAdminPage());
  });

  app.get("/admin/status", async () => ({
    ok: true,
    pid: process.pid,
    uptimeSeconds: process.uptime(),
    nodeEnv: config.nodeEnv,
    config: {
      port: config.port,
      llmProvider: config.llm.provider,
      openaiKeyConfigured: Boolean(config.llm.openaiApiKey),
      geminiKeyConfigured: Boolean(config.llm.geminiApiKey),
      openaiModel: config.llm.openaiModel,
      geminiModel: config.llm.geminiModel,
      telegramBotConfigured: Boolean(config.telegram.botToken),
      operatorChatConfigured: Boolean(config.telegram.operatorChatId),
      customerTelegramEnabled: config.telegram.customerTelegramEnabled,
      requirePriceApproval: config.sales.requirePriceApproval,
      publicDiscountLimit: config.sales.publicDiscountLimit,
      defaultCurrency: config.sales.defaultCurrency,
      companySiteUrl: config.sales.companySiteUrl,
      approvalSlaHours: config.sales.approvalSlaHours
    },
    counts: {
      activeSessions: store.listActiveSessions(100).length,
      pendingApprovals: store.listPendingApprovals(100).length,
      totalSessions: store.countSessions(),
      totalApprovals: store.countApprovals(),
      totalMessages: store.countMessages()
    }
  }));

  app.get("/admin/dashboard", async () => buildStats(store));

  app.get("/admin/sessions", async (request) => {
    const { status, limit } = z
      .object({ status: z.string().optional(), limit: z.coerce.number().int().positive().max(500).default(100) })
      .parse(request.query ?? {});
    const all = store.listAllSessions(limit);
    const filtered = status ? all.filter((s) => s.status === status) : all;
    return { sessions: filtered.map((s) => decorateSession(s, store)) };
  });

  app.get("/admin/sessions/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const session = store.getSession(id);
    if (!session) {
      reply.status(404).send({ ok: false, error: "session not found" });
      return;
    }
    const messages = store.listAllMessages(id);
    const approvals = store.listAllApprovals(1000).filter((a) => a.sessionId === id);
    reply.send({ session: decorateSession(session, store), messages, approvals });
  });

  app.get("/admin/approvals", async (request) => {
    const { status, limit } = z
      .object({ status: z.string().optional(), limit: z.coerce.number().int().positive().max(500).default(100) })
      .parse(request.query ?? {});
    const all = store.listAllApprovals(limit);
    const filtered = status ? all.filter((a) => a.status === status) : all;
    const enriched = filtered.map((approval) => {
      const session = store.getSession(approval.sessionId);
      return {
        ...approval,
        session: session
          ? { id: session.id, channel: session.channel, displayName: session.displayName, channelUserId: session.channelUserId, status: session.status }
          : undefined
      };
    });
    return { approvals: enriched };
  });

  app.get("/admin/messages", async (request) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().positive().max(500).default(100) })
      .parse(request.query ?? {});
    const recent = store.listRecentMessagesAcrossSessions(limit);
    const enriched: Array<MessageRecord & { sessionDisplay?: string }> = recent.map((m) => {
      const s = store.getSession(m.sessionId);
      return { ...m, sessionDisplay: s ? s.displayName ?? s.channelUserId : undefined };
    });
    return { messages: enriched };
  });

  // ---------- Operator actions (Web UI) ----------
  app.post("/admin/approvals/:id/approve", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ operator: z.string().default("web-operator") }).parse(request.body ?? {});
    try {
      const result = await agent.approveApproval(id, body.operator);
      const delivery = await agent.deliverToCustomer(result.session, result.text);
      reply.send({ ok: true, sessionId: result.session.id, text: result.text, delivery });
    } catch (error) {
      reply.status(400).send({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/admin/approvals/:id/reject", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z
      .object({ operator: z.string().default("web-operator"), note: z.string().optional() })
      .parse(request.body ?? {});
    try {
      const approval = await agent.rejectApproval(id, body.operator, body.note ?? "Rejected from web dashboard.");
      reply.send({ ok: true, approval });
    } catch (error) {
      reply.status(400).send({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/admin/sessions/:id/pause", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z
      .object({ operator: z.string().default("web-operator"), reason: z.string().optional() })
      .parse(request.body ?? {});
    try {
      const session = await agent.pauseSession(id, body.operator, body.reason ?? "Paused from web dashboard.");
      reply.send({ ok: true, session });
    } catch (error) {
      reply.status(400).send({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/admin/sessions/:id/resume", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ operator: z.string().default("web-operator") }).parse(request.body ?? {});
    try {
      const session = await agent.resumeSession(id, body.operator);
      reply.send({ ok: true, session });
    } catch (error) {
      reply.status(400).send({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/admin/sessions/:id/takeover", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ operator: z.string().default("web-operator") }).parse(request.body ?? {});
    try {
      const session = await agent.takeoverSession(id, body.operator);
      reply.send({ ok: true, session });
    } catch (error) {
      reply.status(400).send({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/admin/sessions/:id/reply", async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z
      .object({ text: z.string().min(1), operator: z.string().default("web-operator") })
      .parse(request.body ?? {});
    try {
      const result = await agent.humanReply(id, body.text, body.operator);
      const delivery = await agent.deliverToCustomer(result.session, result.text);
      reply.send({ ok: true, sessionId: result.session.id, text: result.text, delivery });
    } catch (error) {
      reply.status(400).send({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ---------- Existing ingress ----------
  app.post("/webhooks/site/message", async (request, reply) => {
    const body = z.object({
      customerId: z.string().min(1),
      text: z.string().min(1),
      displayName: z.string().optional(),
      locale: z.string().optional()
    }).parse(request.body);

    const result = await agent.handleCustomerMessage({
      channel: "site",
      channelUserId: body.customerId,
      displayName: body.displayName,
      locale: body.locale,
      text: body.text
    });

    reply.send(result);
  });

  app.post("/operator/reply", async (request, reply) => {
    const body = z.object({
      sessionId: z.string().min(1),
      text: z.string().min(1),
      operator: z.string().default("http-operator")
    }).parse(request.body);
    const result = await agent.humanReply(body.sessionId, body.text, body.operator);
    const delivery = await agent.deliverToCustomer(result.session, result.text);
    reply.send({ ...result, delivery });
  });

  app.setErrorHandler((error, _request, reply) => {
    logger.error("http request failed", { error: error.message });
    reply.status(400).send({ ok: false, error: error.message });
  });

  return app;
}
