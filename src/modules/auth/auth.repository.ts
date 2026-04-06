import { AuthSessionModel, PasswordResetTokenModel } from "@/modules/auth/auth.model.js";

export class AuthRepository {
  createSession(payload: {
    userId: string;
    sessionId: string;
    userAgent?: string;
    ipAddress?: string;
    lastUsedAt: Date;
    expiresAt: Date;
  }) {
    return AuthSessionModel.create(payload);
  }

  findActiveSession(sessionId: string) {
    return AuthSessionModel.findOne({
      sessionId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async touchSession(sessionId: string, expiresAt?: Date): Promise<void> {
    const update: {
      lastUsedAt: Date;
      expiresAt?: Date;
    } = {
      lastUsedAt: new Date(),
    };

    if (expiresAt)
      update.expiresAt = expiresAt;

    await AuthSessionModel.updateOne(
      { sessionId, revokedAt: null },
      { $set: update },
    ).exec();
  }

  async revokeSession(sessionId: string): Promise<void> {
    await AuthSessionModel.updateOne(
      { sessionId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  }

  async revokeSessionsForUser(userId: string): Promise<void> {
    await AuthSessionModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  }

  async deletePasswordResetTokensForUser(userId: string): Promise<void> {
    await PasswordResetTokenModel.deleteMany({ userId }).exec();
  }

  createPasswordResetToken(payload: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return PasswordResetTokenModel.create(payload);
  }

  findValidPasswordResetToken(tokenHash: string) {
    return PasswordResetTokenModel.findOne({
      tokenHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async consumePasswordResetToken(tokenHash: string): Promise<void> {
    await PasswordResetTokenModel.updateOne(
      { tokenHash, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    ).exec();
  }
}
