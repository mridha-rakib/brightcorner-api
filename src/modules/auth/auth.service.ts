import type { SessionMetadata, SignInInput, SignUpInput } from "@/modules/auth/auth.interface.js";
import type { AuthenticatedResult } from "@/modules/auth/auth.type.js";

import { AUTH_CONSTANTS } from "@/common/auth/auth.constants.js";
import { PasswordService } from "@/common/auth/password.service.js";
import { TokenService } from "@/common/auth/token.service.js";
import { MailService } from "@/common/mail/mail.service.js";
import { HTTPSTATUS } from "@/config/http.config.js";
import { ErrorCodeEnum } from "@/enums/error-code.enum.js";
import { AuthRepository } from "@/modules/auth/auth.repository.js";
import {
  createPasswordResetToken,
  createSessionId,
  hashToken,
} from "@/modules/auth/auth.utils.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { UsersService } from "@/modules/users/users.service.js";
import { toPublicUser } from "@/modules/users/users.utils.js";
import { AppError, NotFoundException } from "@/utils/app-error.utils.js";

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository = new AuthRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly usersService: UsersService = new UsersService(),
    private readonly passwordService: PasswordService = new PasswordService(),
    private readonly tokenService: TokenService = new TokenService(),
    private readonly mailService: MailService = new MailService(),
  ) {}

  async signUp(input: SignUpInput): Promise<AuthenticatedResult> {
    const passwordHash = await this.passwordService.hash(input.password);
    const user = await this.usersService.createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
    });

    return this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      metadata: input,
    });
  }

  async signIn(input: SignInInput): Promise<AuthenticatedResult> {
    const user = await this.usersRepository.findByEmailOrUsername(input.identifier, true);
    if (!user) {
      throw new AppError("Invalid email, username, or password.", {
        statusCode: HTTPSTATUS.UNAUTHORIZED,
        errorCode: ErrorCodeEnum.AUTH_INVALID_CREDENTIALS,
      });
    }

    const passwordMatches = await this.passwordService.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Invalid email, username, or password.", {
        statusCode: HTTPSTATUS.UNAUTHORIZED,
        errorCode: ErrorCodeEnum.AUTH_INVALID_CREDENTIALS,
      });
    }

    if (user.status !== "active") {
      throw new AppError("This account is not allowed to sign in.", {
        statusCode: HTTPSTATUS.FORBIDDEN,
        errorCode: ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS,
      });
    }

    await this.usersService.markLastLogin(user.id);

    return this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      metadata: input,
    });
  }

  async refreshSession(refreshToken: string): Promise<AuthenticatedResult> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const session = await this.authRepository.findActiveSession(payload.sessionId);

    if (!session || String(session.userId) !== payload.sub) {
      throw new AppError("Refresh session is invalid or expired.", {
        statusCode: HTTPSTATUS.UNAUTHORIZED,
        errorCode: ErrorCodeEnum.AUTH_TOKEN_INVALID,
      });
    }

    const user = await this.usersRepository.findActiveById(payload.sub);
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    await this.authRepository.touchSession(payload.sessionId);

    return {
      user: toPublicUser(user),
      tokens: {
        accessToken: this.tokenService.signAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: payload.sessionId,
        }),
        refreshToken,
      },
    };
  }

  async signOut(refreshToken?: string): Promise<void> {
    if (!refreshToken)
      return;

    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      await this.authRepository.revokeSession(payload.sessionId);
    }
    catch {
      // Swallow invalid tokens and always allow the caller to clear auth cookies.
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user)
      return;

    await this.authRepository.deletePasswordResetTokensForUser(user.id);

    const resetToken = createPasswordResetToken();
    const tokenHash = hashToken(resetToken);

    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_TTL_MS),
    });

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetToken,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const passwordResetToken = await this.authRepository.findValidPasswordResetToken(tokenHash);

    if (!passwordResetToken) {
      throw new AppError("Password reset token is invalid or expired.", {
        statusCode: HTTPSTATUS.BAD_REQUEST,
        errorCode: ErrorCodeEnum.PASSWORD_RESET_TOKEN_INVALID,
      });
    }

    const user = await this.usersRepository.findByIdWithPasswordHash(String(passwordResetToken.userId));
    if (!user)
      throw new NotFoundException("User not found.");

    user.passwordHash = await this.passwordService.hash(newPassword);
    await user.save();
    await this.authRepository.consumePasswordResetToken(tokenHash);
    await this.authRepository.revokeSessionsForUser(user.id);
  }

  async getCurrentUser(userId: string) {
    return this.usersService.getCurrentUser(userId);
  }

  private async issueTokens(input: {
    userId: string;
    email: string;
    role: "user" | "admin";
    metadata: SessionMetadata;
  }): Promise<AuthenticatedResult> {
    const sessionId = createSessionId();
    const refreshExpiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS);

    await this.authRepository.createSession({
      userId: input.userId,
      sessionId,
      userAgent: input.metadata.userAgent,
      ipAddress: input.metadata.ipAddress,
      lastUsedAt: new Date(),
      expiresAt: refreshExpiresAt,
    });

    const user = await this.usersService.getCurrentUser(input.userId);

    return {
      user,
      tokens: {
        accessToken: this.tokenService.signAccessToken({
          userId: input.userId,
          email: input.email,
          role: input.role,
          sessionId,
        }),
        refreshToken: this.tokenService.signRefreshToken({
          userId: input.userId,
          email: input.email,
          role: input.role,
          sessionId,
        }),
      },
    };
  }
}
