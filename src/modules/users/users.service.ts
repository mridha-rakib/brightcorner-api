import type {
  CompleteOnboardingInput,
  CreateUserInput,
  UpdateNotificationSettingsInput,
  UpdatePrivacySettingsInput,
  UpdateUserProfileInput,
} from "@/modules/users/users.interface.js";
import type { PublicUser, UserDocument } from "@/modules/users/users.type.js";

import { PasswordService } from "@/common/auth/password.service.js";
import { HTTPSTATUS } from "@/config/http.config.js";
import { ErrorCodeEnum } from "@/enums/error-code.enum.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import {
  buildFullName,
  normalizeEmail,
  normalizeUsername,
  toPublicUser,
} from "@/modules/users/users.utils.js";
import { AppError, BadRequestException, NotFoundException } from "@/utils/app-error.utils.js";

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly passwordService: PasswordService = new PasswordService(),
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
}
