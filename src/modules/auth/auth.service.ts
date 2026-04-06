import { createHash, randomInt } from "node:crypto";

import type {
  ResendSignInTwoFactorInput,
  SessionMetadata,
  SignInInput,
  SignUpInput,
  VerifySignInTwoFactorInput,
} from "@/modules/auth/auth.interface.js";
import type {
  AuthenticatedResult,
  SignInResult,
  TwoFactorChallenge,
} from "@/modules/auth/auth.type.js";
import type { UserDocument } from "@/modules/users/users.type.js";

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
import { maskEmailAddress, toPublicUser } from "@/modules/users/users.utils.js";
import { AppError, BadRequestException, NotFoundException } from "@/utils/app-error.utils.js";

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

  async signIn(input: SignInInput): Promise<SignInResult> {
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

    if (user.isTwoFactorEnabled) {
      return {
        status: "two_factor_required",
        challenge: await this.prepareSignInTwoFactorChallenge(user),
      };
    }

    const authenticatedResult = await this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      metadata: input,
    });

    await this.usersService.markLastLogin(user.id);

    return {
      status: "authenticated",
      user: authenticatedResult.user,
      tokens: authenticatedResult.tokens,
    };
  }

  async verifySignInTwoFactor(input: VerifySignInTwoFactorInput): Promise<AuthenticatedResult> {
    const user = await this.resolveTwoFactorChallengeUser(input.challengeToken);
    const codeHash = user.twoFactorCodeHash;
    const expiresAt = user.twoFactorCodeExpiresAt;

    if (!codeHash || !expiresAt)
      throw new BadRequestException("Request a verification code before continuing.");

    if (expiresAt.getTime() < Date.now()) {
      user.twoFactorCodeHash = undefined;
      user.twoFactorCodeExpiresAt = null;
      await user.save();
      throw new BadRequestException("Your verification code has expired. Request a new code.");
    }

    if (codeHash !== this.hashTwoFactorCode(input.code))
      throw new BadRequestException("The verification code is invalid.");

    user.twoFactorCodeHash = undefined;
    user.twoFactorCodeExpiresAt = null;
    await user.save();

    const authenticatedResult = await this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      metadata: input,
    });

    await this.usersService.markLastLogin(user.id);
    return authenticatedResult;
  }

  async resendSignInTwoFactor(input: ResendSignInTwoFactorInput): Promise<TwoFactorChallenge> {
    const user = await this.resolveTwoFactorChallengeUser(input.challengeToken);
    return this.prepareSignInTwoFactorChallenge(user, true);
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

    const refreshExpiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS);

    await this.authRepository.touchSession(payload.sessionId, refreshExpiresAt);

    return {
      user: toPublicUser(user),
      tokens: {
        accessToken: this.tokenService.signAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: payload.sessionId,
        }),
        refreshToken: this.tokenService.signRefreshToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId: payload.sessionId,
        }),
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

  private async prepareSignInTwoFactorChallenge(
    user: UserDocument,
    forceNewCode = false,
  ): Promise<TwoFactorChallenge> {
    const now = Date.now();
    const lastSentAt = user.twoFactorLastSentAt?.getTime() ?? 0;
    const hasActiveCode = Boolean(
      user.twoFactorCodeHash
      && user.twoFactorCodeExpiresAt
      && user.twoFactorCodeExpiresAt.getTime() > now,
    );

    const shouldReuseExistingCode = !forceNewCode
      && hasActiveCode
      && lastSentAt
      && now - lastSentAt < AUTH_CONSTANTS.TWO_FACTOR_RESEND_COOLDOWN_MS;

    if (!shouldReuseExistingCode) {
      if (lastSentAt && now - lastSentAt < AUTH_CONSTANTS.TWO_FACTOR_RESEND_COOLDOWN_MS) {
        throw new BadRequestException("Please wait a few seconds before requesting another code.");
      }

      const code = randomInt(100000, 1000000).toString();
      user.twoFactorCodeHash = this.hashTwoFactorCode(code);
      user.twoFactorCodeExpiresAt = new Date(now + AUTH_CONSTANTS.TWO_FACTOR_CODE_TTL_MS);
      user.twoFactorLastSentAt = new Date(now);
      await user.save();

      await this.mailService.sendTwoFactorCodeEmail({
        code,
        firstName: user.firstName,
        to: user.email,
      });
    }

    return this.buildTwoFactorChallenge(user);
  }

  private buildTwoFactorChallenge(user: UserDocument): TwoFactorChallenge {
    return {
      requiresTwoFactor: true,
      challengeToken: this.tokenService.signTwoFactorChallengeToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
      deliveryLabel: maskEmailAddress(user.email),
      deliveryMethod: "email",
      expiresAt: user.twoFactorCodeExpiresAt ?? null,
      lastSentAt: user.twoFactorLastSentAt ?? null,
    };
  }

  private async resolveTwoFactorChallengeUser(challengeToken: string): Promise<UserDocument> {
    const payload = this.tokenService.verifyTwoFactorChallengeToken(challengeToken);
    const user = await this.usersRepository.findByIdWithTwoFactorState(payload.sub);

    if (!user)
      throw new NotFoundException("User not found.");

    if (user.status !== "active") {
      throw new AppError("This account is not allowed to sign in.", {
        statusCode: HTTPSTATUS.FORBIDDEN,
        errorCode: ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS,
      });
    }

    if (!user.isTwoFactorEnabled)
      throw new BadRequestException("Two-factor authentication is not enabled for this account.");

    return user;
  }

  private hashTwoFactorCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }
}
