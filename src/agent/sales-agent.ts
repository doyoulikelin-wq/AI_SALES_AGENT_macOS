import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { Logger } from "../logger.js";
import type { LlmClient } from "../llm/llm-client.js";
import type { JsonlStore } from "../store/jsonl-store.js";
import type { AgentResult, Approval, ApprovalType, CustomerMessageInput, MessageRecord, Session } from "../types.js";
import { newId, nowIso } from "../utils/id.js";

export interface OperatorNotifier {
  notifyApproval(approval: Approval, session: Session): Promise<void>;
  notifyHumanQueue(session: Session, customerText: string, reason: string): Promise<void>;
  deliverCustomerMessage?(session: Session, text: string): Promise<{ delivered: boolean; reason?: string }>;
}

interface RiskCheck {
  type: ApprovalType;
  risk: string;
  reason: string;
  pattern: RegExp;
}

const riskChecks: RiskCheck[] = [
  {
    type: "price",
    risk: "price",
    reason: "Price, discount, or payment terms require approval.",
    pattern: /(price|quote|quotation|discount|best price|target price|cheap|cheaper|payment term|credit|价格|报价|折扣|便宜|付款|账期|値段|価格|割引|가격|할인|سعر|خصم)/i
  },
  {
    type: "contract",
    risk: "contract",
    reason: "Contract, exclusivity, refund, or legal terms require approval.",
    pattern: /(contract|agreement|exclusive|exclusivity|refund|compensation|penalty|合同|协议|独家|退款|赔偿|違約|계약|환불|تعويض|عقد)/i
  },
  {
    type: "medical",
    risk: "medical",
    reason: "Medical or disease claims require human review.",
    pattern: /(cure|treat|treatment|diagnose|disease|cancer|diabetes|blood pressure|治疗|治愈|诊断|疾病|癌|糖尿病|血压|治療|病気|암|당뇨|علاج|مرض)/i
  },
  {
    type: "complaint",
    risk: "complaint",
    reason: "Complaint, quality issue, or adverse reaction requires human review.",
    pattern: /(complaint|quality issue|damaged|adverse|side effect|return|投诉|质量问题|破损|副作用|退货|クレーム|품질|불만|شكوى)/i
  },
  {
    type: "custom",
    risk: "custom",
    reason: "Custom formula, package, or certification request requires approval.",
    pattern: /(custom formula|custom packaging|private label|certificate|certification|OEM|ODM|定制|私标|配方|认证|証明|맞춤|인증|شهادة)/i
  }
];

export class SalesAgent {
  private notifier?: OperatorNotifier;
  private systemPrompt = "";

  constructor(
    private readonly config: AppConfig,
    private readonly store: JsonlStore,
    private readonly llm: LlmClient,
    private readonly logger: Logger
  ) {}

  setOperatorNotifier(notifier: OperatorNotifier): void {
    this.notifier = notifier;
  }

  async init(): Promise<void> {
    this.systemPrompt = await this.loadSystemPrompt();
  }

  async handleCustomerMessage(input: CustomerMessageInput): Promise<AgentResult> {
    const session = await this.getOrCreateSession(input);
    session.chatId = input.chatId ?? session.chatId;
    session.displayName = input.displayName ?? session.displayName;
    session.locale = input.locale ?? session.locale;
    session.updatedAt = nowIso();

    await this.store.appendMessage(this.message(session, "customer", input.text));

    if (session.status === "paused" || session.status === "human_takeover" || session.status === "waiting_approval") {
      await this.store.upsertSession(session);
      await this.notifier?.notifyHumanQueue(session, input.text, `Session is ${session.status}.`);
      return {
        session,
        status: "queued_for_human",
        customerReply: session.status === "waiting_approval" ? this.holdingReply(session.locale) : undefined
      };
    }

    const risk = this.detectRisk(input.text);
    if (risk && (risk.type !== "price" || this.config.sales.requirePriceApproval)) {
      return this.createApproval(session, input.text, risk.type, risk.risk, risk.reason, this.holdingReply(session.locale));
    }

    try {
      const decision = await this.llm.decide(this.systemPrompt, await this.buildUserPrompt(session, input.text));
      session.salesStage = decision.salesStage;
      session.summary = decision.customerSummary;
      session.updatedAt = nowIso();

      if (decision.needsHuman || decision.approvalType !== "none") {
        const type = decision.approvalType === "none" ? "other" : decision.approvalType;
        return this.createApproval(session, input.text, type, decision.risk, decision.reason, decision.reply);
      }

      session.status = "ai_active";
      await this.store.upsertSession(session);
      await this.store.appendMessage(this.message(session, "agent", decision.reply, { decision }));
      return { session, status: "sent", customerReply: decision.reply };
    } catch (error) {
      this.logger.error("agent decision failed", { error: error instanceof Error ? error.message : String(error) });
      return this.createApproval(
        session,
        input.text,
        "other",
        "llm_error",
        "LLM failed or returned an unsafe response.",
        this.holdingReply(session.locale)
      );
    }
  }

  async approveApproval(approvalId: string, approver: string): Promise<{ session: Session; text: string }> {
    const approval = this.requireApproval(approvalId);
    const session = this.requireSession(approval.sessionId);
    approval.status = "approved";
    approval.resolvedAt = nowIso();
    approval.resolvedBy = approver;
    session.status = "ai_active";
    session.pendingApprovalId = undefined;
    session.updatedAt = nowIso();

    await this.store.upsertApproval(approval);
    await this.store.upsertSession(session);
    await this.store.appendMessage(this.message(session, "agent", approval.proposedReply, { approvalId }));
    return { session, text: approval.proposedReply };
  }

  async rejectApproval(approvalId: string, approver: string, note = "Rejected by operator."): Promise<Approval> {
    const approval = this.requireApproval(approvalId);
    const session = this.requireSession(approval.sessionId);
    approval.status = "rejected";
    approval.resolvedAt = nowIso();
    approval.resolvedBy = approver;
    approval.resolutionNote = note;
    session.status = "human_takeover";
    session.pendingApprovalId = undefined;
    session.updatedAt = nowIso();
    await this.store.upsertApproval(approval);
    await this.store.upsertSession(session);
    return approval;
  }

  async humanReply(sessionId: string, text: string, operator: string): Promise<{ session: Session; text: string }> {
    const session = this.requireSession(sessionId);
    if (session.pendingApprovalId) {
      const approval = this.store.getApproval(session.pendingApprovalId);
      if (approval && approval.status === "pending") {
        approval.status = "revised";
        approval.resolvedAt = nowIso();
        approval.resolvedBy = operator;
        approval.resolutionNote = "Operator sent a revised reply.";
        await this.store.upsertApproval(approval);
      }
    }
    session.status = "ai_active";
    session.pendingApprovalId = undefined;
    session.updatedAt = nowIso();
    await this.store.upsertSession(session);
    await this.store.appendMessage(this.message(session, "human", text, { operator }));
    return { session, text };
  }

  async pauseSession(sessionId: string, operator: string, reason = "Paused by operator."): Promise<Session> {
    const session = this.requireSession(sessionId);
    session.status = "paused";
    session.updatedAt = nowIso();
    await this.store.upsertSession(session);
    await this.store.appendMessage(this.message(session, "system", reason, { operator }));
    return session;
  }

  async resumeSession(sessionId: string, operator: string): Promise<Session> {
    const session = this.requireSession(sessionId);
    session.status = "ai_active";
    session.pendingApprovalId = undefined;
    session.updatedAt = nowIso();
    await this.store.upsertSession(session);
    await this.store.appendMessage(this.message(session, "system", "AI resumed by operator.", { operator }));
    return session;
  }

  async takeoverSession(sessionId: string, operator: string): Promise<Session> {
    const session = this.requireSession(sessionId);
    session.status = "human_takeover";
    session.updatedAt = nowIso();
    await this.store.upsertSession(session);
    await this.store.appendMessage(this.message(session, "system", "Human takeover enabled.", { operator }));
    return session;
  }

  async deliverToCustomer(session: Session, text: string): Promise<{ delivered: boolean; reason?: string }> {
    if (!this.notifier?.deliverCustomerMessage) {
      return { delivered: false, reason: "no outbound notifier configured" };
    }
    return this.notifier.deliverCustomerMessage(session, text);
  }

  private async createApproval(
    session: Session,
    customerText: string,
    type: ApprovalType,
    risk: string,
    reason: string,
    proposedReply: string
  ): Promise<AgentResult> {
    const approval: Approval = {
      id: newId("ap"),
      sessionId: session.id,
      type,
      status: "pending",
      reason,
      risk,
      customerText,
      proposedReply,
      requestedAt: nowIso()
    };
    session.status = "waiting_approval";
    session.pendingApprovalId = approval.id;
    session.updatedAt = nowIso();
    await this.store.upsertApproval(approval);
    await this.store.upsertSession(session);
    await this.notifier?.notifyApproval(approval, session);
    return { session, status: "waiting_approval", customerReply: this.holdingReply(session.locale), approval };
  }

  private async getOrCreateSession(input: CustomerMessageInput): Promise<Session> {
    const existing = this.store.findSessionByChannelUser(input.channel, input.channelUserId);
    if (existing) return existing;
    const now = nowIso();
    const session: Session = {
      id: newId("ses"),
      channel: input.channel,
      channelUserId: input.channelUserId,
      chatId: input.chatId,
      displayName: input.displayName,
      locale: input.locale,
      status: "ai_active",
      salesStage: "new_inquiry",
      summary: "New inquiry.",
      createdAt: now,
      updatedAt: now
    };
    await this.store.upsertSession(session);
    return session;
  }

  private message(session: Session, role: MessageRecord["role"], text: string, meta?: Record<string, unknown>): MessageRecord {
    return {
      id: newId("msg"),
      sessionId: session.id,
      role,
      text,
      channel: session.channel,
      createdAt: nowIso(),
      ...(meta ? { meta } : {})
    };
  }

  private detectRisk(text: string): RiskCheck | undefined {
    return riskChecks.find((check) => check.pattern.test(text));
  }

  private holdingReply(locale?: string): string {
    if (locale?.startsWith("zh")) return "我先帮您和负责人确认一下，再给您准确回复。";
    if (locale?.startsWith("ja")) return "担当者に確認してから、正確にご返信いたします。";
    if (locale?.startsWith("ko")) return "담당자에게 확인한 후 정확히 답변드리겠습니다.";
    if (locale?.startsWith("ar")) return "سأتحقق من ذلك مع المدير ثم أعود إليك برد دقيق.";
    return "I will check this with our manager and get back to you shortly.";
  }

  private async buildUserPrompt(session: Session, latestText: string): Promise<string> {
    const recent = this.store.listMessages(session.id, 12)
      .map((message) => `${message.role}: ${message.text}`)
      .join("\n");
    return [
      `Company site: ${this.config.sales.companySiteUrl}`,
      `Currency: ${this.config.sales.defaultCurrency}`,
      `Require price approval: ${this.config.sales.requirePriceApproval}`,
      `Public discount limit: ${this.config.sales.publicDiscountLimit}`,
      `Session status: ${session.status}`,
      `Current summary: ${session.summary}`,
      "Recent messages:",
      recent,
      "Latest customer message:",
      latestText
    ].join("\n");
  }

  private async loadSystemPrompt(): Promise<string> {
    try {
      return await readFile(path.resolve(this.config.promptPath), "utf8");
    } catch {
      return "You are a safe health export sales assistant. Return JSON only. Escalate prices and medical claims.";
    }
  }

  private requireSession(sessionId: string): Session {
    const session = this.store.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    return session;
  }

  private requireApproval(approvalId: string): Approval {
    const approval = this.store.getApproval(approvalId);
    if (!approval) throw new Error(`Approval not found: ${approvalId}`);
    if (approval.status !== "pending") throw new Error(`Approval is already ${approval.status}.`);
    return approval;
  }
}
