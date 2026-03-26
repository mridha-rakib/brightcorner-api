import type { Response } from "express";

import type { AuthTokens } from "@/common/auth/auth.types.js";

import { AUTH_CONSTANTS } from "@/common/auth/auth.constants.js";
import { cookieConfig } from "@/config/cookie.config.js";

export class AuthCookieService {
  setAuthCookies(res: Response, tokens: AuthTokens): void {
    res.cookie(AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, {
      ...cookieConfig,
      maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_MAX_AGE_MS,
      path: "/",
    });

    res.cookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
      ...cookieConfig,
      maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
      path: "/",
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE_NAME, {
      ...cookieConfig,
      path: "/",
    });

    res.clearCookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME, {
      ...cookieConfig,
      path: "/",
    });
  }
}
