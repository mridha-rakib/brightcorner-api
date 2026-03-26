import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import { AuthCookieService } from "@/common/auth/auth-cookie.service.js";
import { AUTH_CONSTANTS } from "@/common/auth/auth.constants.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/modules/auth/auth.schema.js";
import { AuthService } from "@/modules/auth/auth.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

export class AuthController {
  constructor(
    private readonly authService: AuthService = new AuthService(),
    private readonly authCookieService: AuthCookieService = new AuthCookieService(),
  ) {}

  readonly signUp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(signUpSchema, req);
    const result = await this.authService.signUp({
      ...payload.body,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    this.authCookieService.setAuthCookies(res, result.tokens);
    ApiResponse.created(res, result.user, "Account created successfully.");
  };

  readonly signIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(signInSchema, req);
    const result = await this.authService.signIn({
      ...payload.body,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    this.authCookieService.setAuthCookies(res, result.tokens);
    ApiResponse.success(res, result.user, "Signed in successfully.");
  };

  readonly refresh = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.[AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME];
    const result = await this.authService.refreshSession(refreshToken);

    this.authCookieService.setAuthCookies(res, result.tokens);
    ApiResponse.success(res, result.user, "Session refreshed successfully.");
  };

  readonly signOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.[AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME];
    await this.authService.signOut(refreshToken);
    this.authCookieService.clearAuthCookies(res);
    ApiResponse.success(res, null, "Signed out successfully.");
  };

  readonly forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(forgotPasswordSchema, req);
    await this.authService.forgotPassword(payload.body.email);
    ApiResponse.success(
      res,
      null,
      "If an account exists for that email, a password reset message has been sent.",
    );
  };

  readonly resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(resetPasswordSchema, req);
    await this.authService.resetPassword(payload.body.token, payload.body.password);
    ApiResponse.success(res, null, "Password reset successfully.");
  };

  readonly me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await this.authService.getCurrentUser(req.user!.id);
    ApiResponse.success(res, user, "Current user fetched successfully.");
  };
}
