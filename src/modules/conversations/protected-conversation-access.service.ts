import { randomUUID } from "node:crypto";

type ProtectedConversationAccessRecord = {
  conversationId: string;
  expiresAt: number;
  token: string;
  userId: string;
};

export class ProtectedConversationAccessService {
  private static readonly accessByToken = new Map<string, ProtectedConversationAccessRecord>();
  private readonly ttlMs = 30 * 60 * 1000;

  issueAccessToken(input: { conversationId: string; userId: string }): string {
    this.cleanupExpired();

    const token = randomUUID();
    ProtectedConversationAccessService.accessByToken.set(token, {
      conversationId: input.conversationId,
      expiresAt: Date.now() + this.ttlMs,
      token,
      userId: input.userId,
    });

    return token;
  }

  validateAccessToken(input: {
    conversationId: string;
    token?: string;
    userId: string;
  }): boolean {
    this.cleanupExpired();

    if (!input.token)
      return false;

    const record = ProtectedConversationAccessService.accessByToken.get(input.token);
    if (!record)
      return false;

    const isMatch = record.conversationId === input.conversationId && record.userId === input.userId;
    if (!isMatch)
      return false;

    record.expiresAt = Date.now() + this.ttlMs;
    ProtectedConversationAccessService.accessByToken.set(record.token, record);
    return true;
  }

  revokeAccessToken(token?: string): void {
    if (!token)
      return;

    ProtectedConversationAccessService.accessByToken.delete(token);
  }

  private cleanupExpired(): void {
    const now = Date.now();

    for (const [token, record] of ProtectedConversationAccessService.accessByToken.entries()) {
      if (record.expiresAt <= now)
        ProtectedConversationAccessService.accessByToken.delete(token);
    }
  }
}
