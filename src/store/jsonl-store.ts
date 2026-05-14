import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Approval, MessageRecord, Session } from "../types.js";
import type { Logger } from "../logger.js";

export class JsonlStore {
  private readonly sessions = new Map<string, Session>();
  private readonly approvals = new Map<string, Approval>();
  private readonly messages = new Map<string, MessageRecord[]>();
  private readonly sessionsFile: string;
  private readonly approvalsFile: string;
  private readonly messagesFile: string;

  constructor(private readonly dataDir: string, private readonly logger: Logger) {
    this.sessionsFile = path.join(dataDir, "sessions.jsonl");
    this.approvalsFile = path.join(dataDir, "approvals.jsonl");
    this.messagesFile = path.join(dataDir, "messages.jsonl");
  }

  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    for (const session of await this.readJsonl<Session>(this.sessionsFile)) {
      this.sessions.set(session.id, session);
    }
    for (const approval of await this.readJsonl<Approval>(this.approvalsFile)) {
      this.approvals.set(approval.id, approval);
    }
    for (const message of await this.readJsonl<MessageRecord>(this.messagesFile)) {
      const list = this.messages.get(message.sessionId) ?? [];
      list.push(message);
      this.messages.set(message.sessionId, list);
    }
    this.logger.info("store loaded", {
      sessions: this.sessions.size,
      approvals: this.approvals.size,
      messageSessions: this.messages.size
    });
  }

  async upsertSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
    await this.appendJsonl(this.sessionsFile, session);
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  findSessionByChannelUser(channel: string, channelUserId: string): Session | undefined {
    return Array.from(this.sessions.values()).find(
      (session) => session.channel === channel && session.channelUserId === channelUserId && session.status !== "closed"
    );
  }

  listActiveSessions(limit = 20): Session[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.status !== "closed")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  listAllSessions(limit = 200): Session[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  countSessions(): number {
    return this.sessions.size;
  }

  async appendMessage(message: MessageRecord): Promise<void> {
    const list = this.messages.get(message.sessionId) ?? [];
    list.push(message);
    this.messages.set(message.sessionId, list);
    await this.appendJsonl(this.messagesFile, message);
  }

  listMessages(sessionId: string, limit = 20): MessageRecord[] {
    const list = this.messages.get(sessionId) ?? [];
    return list.slice(Math.max(0, list.length - limit));
  }

  listAllMessages(sessionId: string): MessageRecord[] {
    return [...(this.messages.get(sessionId) ?? [])];
  }

  listRecentMessagesAcrossSessions(limit = 50): MessageRecord[] {
    const all: MessageRecord[] = [];
    for (const list of this.messages.values()) all.push(...list);
    return all
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  countMessages(): number {
    let total = 0;
    for (const list of this.messages.values()) total += list.length;
    return total;
  }

  async upsertApproval(approval: Approval): Promise<void> {
    this.approvals.set(approval.id, approval);
    await this.appendJsonl(this.approvalsFile, approval);
  }

  getApproval(id: string): Approval | undefined {
    return this.approvals.get(id);
  }

  listPendingApprovals(limit = 20): Approval[] {
    return Array.from(this.approvals.values())
      .filter((approval) => approval.status === "pending")
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .slice(0, limit);
  }

  listAllApprovals(limit = 200): Approval[] {
    return Array.from(this.approvals.values())
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .slice(0, limit);
  }

  countApprovals(): number {
    return this.approvals.size;
  }

  private async readJsonl<T>(filePath: string): Promise<T[]> {
    try {
      const raw = await readFile(filePath, "utf8");
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as T);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async appendJsonl(filePath: string, value: unknown): Promise<void> {
    await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
  }
}
