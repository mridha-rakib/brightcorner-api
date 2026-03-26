import type { JwtPayload } from "jsonwebtoken";

export type AuthRole = "user" | "admin";
export type AuthTokenType = "access" | "refresh";

export type AuthTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  role: AuthRole;
  sessionId: string;
  type: AuthTokenType;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};
