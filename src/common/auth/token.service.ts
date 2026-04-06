import type { SignOptions } from "jsonwebtoken";

import jwt from "jsonwebtoken";

import type {
  AuthRole,
  AuthTokenPayload,
  AuthTokenType,
  TwoFactorChallengeTokenPayload,
} from "@/common/auth/auth.types.js";

import { AUTH_CONSTANTS } from "@/common/auth/auth.constants.js";
import { HTTPSTATUS } from "@/config/http.config.js";
import { ErrorCodeEnum } from "@/enums/error-code.enum.js";
import { env } from "@/env.js";
import { AppError } from "@/utils/app-error.utils.js";

type SignTokenInput = {
  userId: string;
  email: string;
  role: AuthRole;
  sessionId: string;
};

type SignTwoFactorTokenInput = Omit<SignTokenInput, "sessionId">;

export class TokenService {
  signAccessToken(input: SignTokenInput): string {
    return this.signToken(input, "access", env.JWT_SECRET, AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN);
  }

  signRefreshToken(input: SignTokenInput): string {
    return this.signToken(input, "refresh", env.JWT_REFRESH_SECRET, AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN);
  }

  signTwoFactorChallengeToken(input: SignTwoFactorTokenInput): string {
    return this.signTwoFactorToken(
      input,
      env.JWT_SECRET,
      AUTH_CONSTANTS.TWO_FACTOR_CHALLENGE_EXPIRES_IN,
    );
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    return this.verifyToken(token, env.JWT_SECRET, "access");
  }

  verifyRefreshToken(token: string): AuthTokenPayload {
    return this.verifyToken(token, env.JWT_REFRESH_SECRET, "refresh");
  }

  verifyTwoFactorChallengeToken(token: string): TwoFactorChallengeTokenPayload {
    return this.verifyTwoFactorToken(token, env.JWT_SECRET);
  }

  private signToken(
    input: SignTokenInput,
    type: AuthTokenType,
    secret: string,
    expiresIn: SignOptions["expiresIn"],
  ): string {
    return jwt.sign(
      {
        email: input.email,
        role: input.role,
        sessionId: input.sessionId,
        type,
      },
      secret,
      {
        expiresIn,
        subject: input.userId,
      },
    );
  }

  private signTwoFactorToken(
    input: SignTwoFactorTokenInput,
    secret: string,
    expiresIn: SignOptions["expiresIn"],
  ): string {
    return jwt.sign(
      {
        email: input.email,
        role: input.role,
        type: "two-factor",
      },
      secret,
      {
        expiresIn,
        subject: input.userId,
      },
    );
  }

  private verifyToken(token: string, secret: string, expectedType: AuthTokenType): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, secret) as AuthTokenPayload;

      if (payload.type !== expectedType) {
        throw new AppError("Invalid token type", {
          statusCode: HTTPSTATUS.UNAUTHORIZED,
          errorCode: ErrorCodeEnum.AUTH_TOKEN_INVALID,
        });
      }

      return payload;
    }
    catch (error) {
      if (error instanceof AppError)
        throw error;

      throw new AppError("Invalid or expired token", {
        statusCode: HTTPSTATUS.UNAUTHORIZED,
        errorCode: ErrorCodeEnum.AUTH_TOKEN_INVALID,
        cause: error,
      });
    }
  }

  private verifyTwoFactorToken(token: string, secret: string): TwoFactorChallengeTokenPayload {
    try {
      const payload = jwt.verify(token, secret) as TwoFactorChallengeTokenPayload;

      if (payload.type !== "two-factor") {
        throw new AppError("Invalid token type", {
          statusCode: HTTPSTATUS.UNAUTHORIZED,
          errorCode: ErrorCodeEnum.AUTH_TOKEN_INVALID,
        });
      }

      return payload;
    }
    catch (error) {
      if (error instanceof AppError)
        throw error;

      throw new AppError("Invalid or expired token", {
        statusCode: HTTPSTATUS.UNAUTHORIZED,
        errorCode: ErrorCodeEnum.AUTH_TOKEN_INVALID,
        cause: error,
      });
    }
  }
}
