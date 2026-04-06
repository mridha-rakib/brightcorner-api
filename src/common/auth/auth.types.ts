import type { JwtPayload } from "jsonwebtoken";

export type AuthRole = "user" | "admin";
export type AuthTokenType = "access" | "refresh" | "two-factor";

export type AuthTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  role: AuthRole;
  sessionId: string;
  type: AuthTokenType;
};

export type TwoFactorChallengeTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  role: AuthRole;
  type: "two-factor";
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};
