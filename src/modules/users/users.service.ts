import { createHash, randomInt } from "node:crypto";

import type {
  CompleteOnboardingInput,
  CreateUserInput,
  UpdateNotificationSettingsInput,
  UpdatePrivacySettingsInput,
  UpdateUserProfileInput,
  VerifyTwoFactorInput,
} from "@/modules/users/users.interface.js";
import type { PublicUser, TwoFactorSettings, UserDocument } from "@/modules/users/users.type.js";

import { AUTH_CONSTANTS } from "@/common/auth/auth.constants.js";
import { PasswordService } from "@/common/auth/password.service.js";
import { MailService } from "@/common/mail/mail.service.js";
import { HTTPSTATUS } from "@/config/http.config.js";
import { ErrorCodeEnum } from "@/enums/error-code.enum.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import {
  buildFullName,
  normalizeEmail,
  normalizeUsername,
  toTwoFactorSettings,
  toPublicUser,
} from "@/modules/users/users.utils.js";
import { AppError, BadRequestException, NotFoundException } from "@/utils/app-error.utils.js";

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly passwordService: PasswordService = new PasswordService(),
    private readonly mailService: MailService = new MailService(),
  ) {}

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    if (await this.usersRepository.isEmailTaken(email)) {
      throw new AppError("An account with this email already exists.", {
        statusCode: HTTPSTATUS.CONFLICT,
        errorCode: ErrorCodeEnum.AUTH_EMAIL_ALREADY_EXISTS,
      });
    }

    const createdUser = await this.usersRepository.createUser({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fullName: buildFullName(input.firstName, input.lastName),
      email,
      passwordHash: input.passwordHash,
    });

    return toPublicUser(createdUser);
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.getUserDocument(userId);
    return toPublicUser(user);
  }

  async listDirectory(userId: string, search?: string): Promise<PublicUser[]> {
    const allUsers = await this.usersRepository.listDirectory(userId);

    const normalizedSearch = search?.trim().toLowerCase();

    return allUsers
      .map(user => toPublicUser(user))
      .filter((user) => {
        if (!normalizedSearch)
          return true;

        return [
          user.fullName,
          user.email,
          user.profile.username,
        ]
          .filter(Boolean)
          .some(value => value?.toLowerCase().includes(normalizedSearch));
      });
  }

  async completeOnboarding(userId: string, input: CompleteOnboardingInput): Promise<PublicUser> {
    const user = await this.getUserDocument(userId);
    const normalizedUsername = normalizeUsername(input.username);

    if (await this.usersRepository.isUsernameTaken(normalizedUsername, user.id)) {
      throw new AppError("That username is already in use.", {
        statusCode: HTTPSTATUS.CONFLICT,
        errorCode: ErrorCodeEnum.RESOURCE_CONFLICT,
      });
    }

    user.profile.username = normalizedUsername;
    user.profile.bio = input.bio?.trim() ?? user.profile.bio;
    user.profile.avatarUrl = input.avatarUrl?.trim() ?? user.profile.avatarUrl;
    user.privacySettings = {
      ...user.privacySettings,
      ...input.privacySettings,
    };
    user.notificationSettings = {
      ...user.notificationSettings,
      ...input.notificationSettings,
    };
    user.onboardingCompleted = true;

    await user.save();
    return toPublicUser(user);
  }

  async updateProfile(userId: string, input: UpdateUserProfileInput): Promise<PublicUser> {
    const user = await this.getUserDocument(userId);

    if (input.username) {
      const normalizedUsername = normalizeUsername(input.username);
      if (await this.usersRepository.isUsernameTaken(normalizedUsername, user.id)) {
        throw new AppError("That username is already in use.", {
          statusCode: HTTPSTATUS.CONFLICT,
          errorCode: ErrorCodeEnum.RESOURCE_CONFLICT,
        });
      }

      user.profile.username = normalizedUsername;
    }

    if (input.firstName !== undefined)
      user.firstName = input.firstName.trim();

    if (input.lastName !== undefined)
      user.lastName = input.lastName.trim();

    if (input.bio !== undefined)
      user.profile.bio = input.bio.trim();

    if (input.avatarUrl !== undefined)
      user.profile.avatarUrl = input.avatarUrl.trim();

    user.fullName = buildFullName(user.firstName, user.lastName);
    await user.save();

    return toPublicUser(user);
  }

  async updatePrivacySettings(userId: string, input: UpdatePrivacySettingsInput): Promise<PublicUser> {
    const user = await this.getUserDocument(userId);
    user.privacySettings = {
      ...user.privacySettings,
      ...input,
    };
    await user.save();

    return toPublicUser(user);
  }

  async updateNotificationSettings(
    userId: string,
    input: UpdateNotificationSettingsInput,
  ): Promise<PublicUser> {
    const user = await this.getUserDocument(userId);
    user.notificationSettings = {
      ...user.notificationSettings,
      ...input,
    };
    await user.save();

    return toPublicUser(user);
  }

  async changeEmail(userId: string, newEmail: string): Promise<PublicUser> {
    const user = await this.getUserDocument(userId);
    const normalizedEmail = normalizeEmail(newEmail);

    if (await this.usersRepository.isEmailTaken(normalizedEmail, user.id)) {
      throw new AppError("That email address is already in use.", {
        statusCode: HTTPSTATUS.CONFLICT,
        errorCode: ErrorCodeEnum.AUTH_EMAIL_ALREADY_EXISTS,
      });
    }

    user.email = normalizedEmail;
    await user.save();

    return toPublicUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findByIdWithPasswordHash(userId);
    if (!user)
      throw new NotFoundException("User not found.");

    const passwordMatches = await this.passwordService.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Current password is incorrect.", {
        statusCode: HTTPSTATUS.UNAUTHORIZED,
        errorCode: ErrorCodeEnum.AUTH_INVALID_CREDENTIALS,
      });
    }

    const isSamePassword = await this.passwordService.compare(newPassword, user.passwordHash);
    if (isSamePassword)
      throw new BadRequestException("The new password must be different from the current password.");

    user.passwordHash = await this.passwordService.hash(newPassword);
    await user.save();
  }

  async deleteMyAccount(userId: string, password: string): Promise<void> {
    const user = await this.usersRepository.findByIdWithPasswordHash(userId);
    if (!user)
      throw new NotFoundException("User not found.");

    const passwordMatches = await this.passwordService.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("Password is incorrect.", {
        statusCode: HTTPSTATUS.UNAUTHORIZED,
        errorCode: ErrorCodeEnum.AUTH_INVALID_CREDENTIALS,
      });
    }

    await user.deleteOne();
  }

  async getTwoFactorSettings(userId: string): Promise<TwoFactorSettings> {
    const user = await this.getUserDocument(userId);
    return toTwoFactorSettings(user);
  }

  async sendTwoFactorCode(userId: string): Promise<TwoFactorSettings> {
    const user = await this.getUserWithTwoFactorState(userId);
    const now = Date.now();
    const lastSentAt = user.twoFactorLastSentAt?.getTime() ?? 0;

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

    return toTwoFactorSettings(user);
  }

  async verifyTwoFactor(userId: string, input: VerifyTwoFactorInput): Promise<PublicUser> {
    const user = await this.getUserWithTwoFactorState(userId);
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

    user.isTwoFactorEnabled = input.enabled;
    user.twoFactorCodeHash = undefined;
    user.twoFactorCodeExpiresAt = null;
    await user.save();

    return toPublicUser(user);
  }

  async markLastLogin(userId: string): Promise<void> {
    const user = await this.getUserDocument(userId);
    user.lastLoginAt = new Date();
    await user.save();
  }

  private async getUserDocument(userId: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(userId);
    if (!user)
      throw new NotFoundException("User not found.");

    return user;
  }

  private async getUserWithTwoFactorState(userId: string): Promise<UserDocument> {
    const user = await this.usersRepository.findByIdWithTwoFactorState(userId);
    if (!user)
      throw new NotFoundException("User not found.");

    return user;
  }

  private hashTwoFactorCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }
}
