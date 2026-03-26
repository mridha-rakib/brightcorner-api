import { model, models, Schema } from "mongoose";

import type { AuthSession, PasswordResetToken } from "@/modules/auth/auth.type.js";

const authSessionSchema = new Schema<AuthSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  lastUsedAt: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  versionKey: false,
});

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const passwordResetTokenSchema = new Schema<PasswordResetToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  consumedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  versionKey: false,
});

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthSessionModel = models.AuthSession || model<AuthSession>("AuthSession", authSessionSchema);
export const PasswordResetTokenModel = models.PasswordResetToken || model<PasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
