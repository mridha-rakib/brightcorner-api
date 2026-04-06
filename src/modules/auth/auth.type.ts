import type { HydratedDocument, Types } from "mongoose";

import type { AuthTokens } from "@/common/auth/auth.types.js";
import type { PublicUser } from "@/modules/users/users.type.js";

export type AuthSession = {
  userId: Types.ObjectId;
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PasswordResetToken = {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthenticatedResult = {
  user: PublicUser;
  tokens: AuthTokens;
};

export type TwoFactorChallenge = {
  requiresTwoFactor: true;
  challengeToken: string;
  deliveryLabel: string;
  deliveryMethod: "email";
  expiresAt: Date | null;
  lastSentAt: Date | null;
};

export type SignInResult
  = | {
      status: "authenticated";
      user: PublicUser;
      tokens: AuthTokens;
    }
    | {
      status: "two_factor_required";
      challenge: TwoFactorChallenge;
    };

export type AuthSessionDocument = HydratedDocument<AuthSession>;
export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;
