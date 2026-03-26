import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  directoryQuerySchema,
  notificationSettingsUpdateSchema,
  onboardingSchema,
  privacySettingsUpdateSchema,
  profileUpdateSchema,
} from "@/modules/users/users.schema.js";
import { UsersService } from "@/modules/users/users.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

export class UsersController {
  constructor(private readonly usersService: UsersService = new UsersService()) {}

  readonly listDirectory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(directoryQuerySchema, req);
    const users = await this.usersService.listDirectory(req.user!.id, payload.query.search);
    ApiResponse.success(res, users, "User directory fetched successfully.");
  };

  readonly getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await this.usersService.getCurrentUser(req.user!.id);
    ApiResponse.success(res, user, "Current user fetched successfully.");
  };

  readonly completeOnboarding = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(onboardingSchema, req);
    const user = await this.usersService.completeOnboarding(req.user!.id, payload.body);
    ApiResponse.success(res, user, "Onboarding completed successfully.");
  };

  readonly updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(profileUpdateSchema, req);
    const user = await this.usersService.updateProfile(req.user!.id, payload.body);
    ApiResponse.success(res, user, "Profile updated successfully.");
  };

  readonly updatePrivacySettings = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(privacySettingsUpdateSchema, req);
    const user = await this.usersService.updatePrivacySettings(req.user!.id, payload.body);
    ApiResponse.success(res, user, "Privacy settings updated successfully.");
  };

  readonly updateNotificationSettings = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(notificationSettingsUpdateSchema, req);
    const user = await this.usersService.updateNotificationSettings(req.user!.id, payload.body);
    ApiResponse.success(res, user, "Notification settings updated successfully.");
  };

  readonly changeEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(changeEmailSchema, req);
    const user = await this.usersService.changeEmail(req.user!.id, payload.body.newEmail);
    ApiResponse.success(res, user, "Email updated successfully.");
  };

  readonly changePassword = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(changePasswordSchema, req);
    await this.usersService.changePassword(
      req.user!.id,
      payload.body.currentPassword,
      payload.body.newPassword,
    );
    ApiResponse.success(res, null, "Password updated successfully.");
  };

  readonly deleteMyAccount = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(deleteAccountSchema, req);
    await this.usersService.deleteMyAccount(req.user!.id, payload.body.password);
    ApiResponse.noContent(res);
  };
}
