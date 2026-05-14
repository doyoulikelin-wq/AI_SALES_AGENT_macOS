export type Channel = "telegram" | "site" | "email" | "whatsapp" | "alibaba" | "manual";

export type SessionStatus = "ai_active" | "waiting_approval" | "paused" | "human_takeover" | "closed";

export type MessageRole = "customer" | "agent" | "human" | "system";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "revised";

export type ApprovalType = "price" | "contract" | "medical" | "complaint" | "custom" | "other";

export interface CustomerMessageInput {
  channel: Channel;
  channelUserId: string;
  chatId?: string;
  displayName?: string;
  locale?: string;
  text: string;
}

export interface Session {
  id: string;
  channel: Channel;
  channelUserId: string;
  chatId?: string;
  displayName?: string;
  locale?: string;
  status: SessionStatus;
  salesStage: string;
  summary: string;
  pendingApprovalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: MessageRole;
  text: string;
  channel: Channel;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface Approval {
  id: string;
  sessionId: string;
  type: ApprovalType;
  status: ApprovalStatus;
  reason: string;
  risk: string;
  customerText: string;
  proposedReply: string;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface AgentDecision {
  reply: string;
  needsHuman: boolean;
  reason: string;
  risk: string;
  language: string;
  salesStage: string;
  nextAction: string;
  approvalType: "none" | ApprovalType;
  customerSummary: string;
}

export interface AgentResult {
  session: Session;
  status: "sent" | "waiting_approval" | "queued_for_human";
  customerReply?: string;
  approval?: Approval;
}
