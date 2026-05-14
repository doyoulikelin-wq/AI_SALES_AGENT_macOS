import { Markup, Telegraf } from "telegraf";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import type { SalesAgent, OperatorNotifier } from "../agent/sales-agent.js";
import type { JsonlStore } from "../store/jsonl-store.js";
import type { Approval, Session } from "../types.js";

export class TelegramBot implements OperatorNotifier {
  private readonly bot?: Telegraf;

  constructor(
    private readonly config: AppConfig,
    private readonly agent: SalesAgent,
    private readonly store: JsonlStore,
    private readonly logger: Logger
  ) {
    if (config.telegram.botToken) {
      this.bot = new Telegraf(config.telegram.botToken);
      this.bot.catch((error, ctx) => {
        this.logger.error("telegram handler crashed", {
          error: error instanceof Error ? error.message : String(error),
          updateType: ctx?.updateType
        });
      });
      this.registerHandlers();
    }
  }

  async start(): Promise<void> {
    if (!this.bot) {
      this.logger.warn("telegram bot disabled because TELEGRAM_BOT_TOKEN is empty");
      return;
    }
    await this.bot.launch({ dropPendingUpdates: false });
    this.logger.info("telegram bot started", { operatorChatIdConfigured: Boolean(this.config.telegram.operatorChatId) });
  }

  async stop(reason = "shutdown"): Promise<void> {
    this.bot?.stop(reason);
  }

  async notifyApproval(approval: Approval, session: Session): Promise<void> {
    if (!this.bot || !this.config.telegram.operatorChatId) return;
    const text = [
      "Approval required",
      `Approval ID: ${approval.id}`,
      `Session ID: ${session.id}`,
      `Channel: ${session.channel}`,
      `Customer: ${session.displayName ?? session.channelUserId}`,
      `Type: ${approval.type}`,
      `Risk: ${approval.risk}`,
      `Reason: ${approval.reason}`,
      "",
      "Customer message:",
      approval.customerText,
      "",
      "Proposed reply:",
      approval.proposedReply,
      "",
      `Use /reply ${session.id} <message> to edit and send.`
    ].join("\n");

    await this.bot.telegram.sendMessage(
      this.config.telegram.operatorChatId,
      text,
      Markup.inlineKeyboard([
        [Markup.button.callback("Approve", `approval:approve:${approval.id}`)],
        [Markup.button.callback("Take over", `approval:takeover:${approval.id}`)],
        [Markup.button.callback("Reject", `approval:reject:${approval.id}`)]
      ])
    );
  }

  async notifyHumanQueue(session: Session, customerText: string, reason: string): Promise<void> {
    if (!this.bot || !this.config.telegram.operatorChatId) return;
    await this.bot.telegram.sendMessage(
      this.config.telegram.operatorChatId,
      [
        "Customer message queued for human",
        `Session ID: ${session.id}`,
        `Status: ${session.status}`,
        `Reason: ${reason}`,
        "",
        customerText,
        "",
        `Use /reply ${session.id} <message> or /resume ${session.id}.`
      ].join("\n")
    );
  }

  private registerHandlers(): void {
    if (!this.bot) return;

    this.bot.command("whoami", async (ctx) => {
      await ctx.reply(`chat_id: ${ctx.chat?.id ?? "unknown"}`);
    });

    this.bot.command("status", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      await ctx.reply([
        "Agent status: running",
        `Active sessions: ${this.store.listActiveSessions(100).length}`,
        `Pending approvals: ${this.store.listPendingApprovals(100).length}`
      ].join("\n"));
    });

    this.bot.command("sessions", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const sessions = this.store.listActiveSessions(20);
      if (!sessions.length) {
        await ctx.reply("No active sessions.");
        return;
      }
      await ctx.reply(sessions.map((session) => this.formatSession(session)).join("\n\n"));
    });

    this.bot.command("pause", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const { first, rest } = this.parseCommand(ctx.message.text);
      if (!first) return ctx.reply("Usage: /pause <sessionId> [reason]");
      const session = await this.agent.pauseSession(first, this.operatorName(ctx), rest || "Paused from Telegram.");
      return ctx.reply(`Paused ${session.id}.`);
    });

    this.bot.command("resume", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const { first } = this.parseCommand(ctx.message.text);
      if (!first) return ctx.reply("Usage: /resume <sessionId>");
      const session = await this.agent.resumeSession(first, this.operatorName(ctx));
      return ctx.reply(`Resumed ${session.id}.`);
    });

    this.bot.command("takeover", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const { first } = this.parseCommand(ctx.message.text);
      if (!first) return ctx.reply("Usage: /takeover <sessionId>");
      const session = await this.agent.takeoverSession(first, this.operatorName(ctx));
      return ctx.reply(`Human takeover enabled for ${session.id}.`);
    });

    this.bot.command("approve", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const { first } = this.parseCommand(ctx.message.text);
      if (!first) return ctx.reply("Usage: /approve <approvalId>");
      const result = await this.agent.approveApproval(first, this.operatorName(ctx));
      const delivery = await this.sendToCustomer(result.session, result.text);
      return ctx.reply(`Approved ${result.session.id}. Delivery: ${delivery.delivered ? "sent to customer" : "skipped (" + (delivery.reason || "unknown") + ")"}`);
    });

    this.bot.command("reject", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const { first, rest } = this.parseCommand(ctx.message.text);
      if (!first) return ctx.reply("Usage: /reject <approvalId> [reason]");
      const approval = await this.agent.rejectApproval(first, this.operatorName(ctx), rest || "Rejected from Telegram.");
      return ctx.reply(`Rejected ${approval.id}; session moved to human takeover.`);
    });

    this.bot.command("reply", async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const { first, rest } = this.parseCommand(ctx.message.text);
      if (!first || !rest) return ctx.reply("Usage: /reply <sessionId> <message>");
      const result = await this.agent.humanReply(first, rest, this.operatorName(ctx));
      const delivery = await this.sendToCustomer(result.session, result.text);
      return ctx.reply(`Human reply saved for ${result.session.id}; AI active again. Delivery: ${delivery.delivered ? "sent" : "skipped (" + (delivery.reason || "unknown") + ")"}`);
    });

    this.bot.action(/^approval:(approve|reject|takeover):(.+)$/, async (ctx) => {
      if (!(await this.requireOperator(ctx))) return;
      const action = ctx.match[1];
      const approvalId = ctx.match[2];
      if (!action || !approvalId) return ctx.reply("Invalid approval action.");
      await ctx.answerCbQuery();
      if (action === "approve") {
        const result = await this.agent.approveApproval(approvalId, this.operatorName(ctx));
        const delivery = await this.sendToCustomer(result.session, result.text);
        await ctx.reply(`Approved ${result.session.id}. Delivery: ${delivery.delivered ? "sent to customer" : "skipped (" + (delivery.reason || "unknown") + ")"}`);
      } else if (action === "reject") {
        const approval = await this.agent.rejectApproval(approvalId, this.operatorName(ctx), "Rejected from Telegram button.");
        await ctx.reply(`Rejected ${approval.id}; session moved to human takeover.`);
      } else {
        const approval = this.store.getApproval(approvalId);
        if (!approval) return ctx.reply(`Approval not found: ${approvalId}`);
        const session = await this.agent.takeoverSession(approval.sessionId, this.operatorName(ctx));
        await ctx.reply(`Human takeover enabled for ${session.id}.`);
      }
    });

    this.bot.on("text", async (ctx) => {
      const text = ctx.message.text.trim();
      if (text.startsWith("/")) return;

      if (this.isOperatorChat(ctx.chat.id)) {
        await ctx.reply("Use /reply <sessionId> <message>, /sessions, /pause, /resume, /takeover, /approve, or /reject.");
        return;
      }

      if (!this.config.telegram.customerTelegramEnabled) {
        await ctx.reply("Telegram customer intake is not enabled.");
        return;
      }

      try {
        const result = await this.agent.handleCustomerMessage({
          channel: "telegram",
          channelUserId: String(ctx.from.id),
          chatId: String(ctx.chat.id),
          displayName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || ctx.from.username,
          locale: ctx.from.language_code,
          text
        });

        if (result.customerReply) {
          await ctx.reply(result.customerReply);
        }
      } catch (error) {
        this.logger.error("customer message handling failed", {
          chatId: ctx.chat.id,
          error: error instanceof Error ? error.message : String(error)
        });
        try {
          await ctx.reply("Thanks for your message — our team has received it and will follow up shortly.");
        } catch {
          // swallow reply failure to avoid throwing back into Telegraf dispatcher
        }
      }
    });
  }

  private async sendToCustomer(session: Session, text: string): Promise<{ delivered: boolean; reason?: string }> {
    const result = await this.deliverCustomerMessage(session, text);
    if (!result.delivered) {
      this.logger.warn("customer delivery skipped", { sessionId: session.id, channel: session.channel, reason: result.reason });
    }
    return result;
  }

  async deliverCustomerMessage(session: Session, text: string): Promise<{ delivered: boolean; reason?: string }> {
    if (!this.bot) return { delivered: false, reason: "telegram bot disabled" };
    if (session.channel !== "telegram" || !session.chatId) {
      return { delivered: false, reason: `channel ${session.channel} has no outbound delivery` };
    }
    try {
      await this.bot.telegram.sendMessage(session.chatId, text);
      return { delivered: true };
    } catch (error) {
      this.logger.warn("telegram delivery failed", { sessionId: session.id, error: error instanceof Error ? error.message : String(error) });
      return { delivered: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  private async requireOperator(ctx: { chat?: { id: number | string }; reply: (text: string) => Promise<unknown> }): Promise<boolean> {
    if (!this.config.telegram.operatorChatId) {
      await ctx.reply("Operator chat is not configured. Send /whoami, then set TELEGRAM_OPERATOR_CHAT_ID in .env.");
      return false;
    }
    if (!ctx.chat || !this.isOperatorChat(ctx.chat.id)) {
      await ctx.reply("This command is only available to the operator chat.");
      return false;
    }
    return true;
  }

  private isOperatorChat(chatId: number | string): boolean {
    return String(chatId) === this.config.telegram.operatorChatId;
  }

  private parseCommand(text: string): { first?: string; rest?: string } {
    const [, ...parts] = text.trim().split(/\s+/);
    const first = parts.shift();
    return { first, rest: parts.join(" ").trim() || undefined };
  }

  private operatorName(ctx: { from?: { username?: string; first_name?: string; id?: number } }): string {
    return ctx.from?.username ?? ctx.from?.first_name ?? String(ctx.from?.id ?? "operator");
  }

  private formatSession(session: Session): string {
    return [
      `${session.id} | ${session.status} | ${session.channel}`,
      `Customer: ${session.displayName ?? session.channelUserId}`,
      `Stage: ${session.salesStage}`,
      `Summary: ${session.summary}`,
      session.pendingApprovalId ? `Pending: ${session.pendingApprovalId}` : undefined
    ].filter(Boolean).join("\n");
  }
}
