import type { Request, Response } from "express";

import rateLimit from "express-rate-limit";

import type { RequestWithContext } from "@/middlewares/request-context.types.js";

import { HTTPSTATUS } from "@/config/http.config.js";
import { ErrorCodeEnum } from "@/enums/error-code.enum.js";
import { env } from "@/env.js";
import { logger } from "@/utils/logger.js";

type RateLimitErrorCode
  = typeof ErrorCodeEnum.AUTH_TOO_MANY_ATTEMPTS
    | typeof ErrorCodeEnum.REQUEST_RATE_LIMITED;

export type RateLimitOptions = {
  errorCode?: RateLimitErrorCode;
  message?: string;
  windowMs?: number;
  max?: number;
};

const DEFAULT_GLOBAL_RATE_LIMIT_MAX_REQUESTS = 1_000;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 30;

export class RateLimitMiddlewareFactory {
  private readonly errorCode: RateLimitErrorCode;
  private readonly message: string;
  private readonly windowMs: number;
  private readonly max: number;

  constructor(options: RateLimitOptions = {}) {
    this.errorCode = options.errorCode ?? ErrorCodeEnum.REQUEST_RATE_LIMITED;
    this.message = options.message ?? "Too many requests. Please slow down and try again shortly.";
    this.windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
    this.max = options.max ?? env.RATE_LIMIT_MAX_REQUESTS;
  }

  public create() {
    return rateLimit({
      windowMs: this.windowMs,
      limit: this.max,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: _request => env.NODE_ENV === "test",
      handler: (request: Request, response: Response) => {
        const requestWithContext = request as RequestWithContext;

        logger.warn("Rate limit exceeded", {
          requestId: requestWithContext.requestId,
          ip: request.ip,
          method: request.method,
          path: request.originalUrl,
        });

        response.status(HTTPSTATUS.TOO_MANY_REQUESTS).json({
          success: false,
          error: {
            code: this.errorCode,
            message: this.message,
            statusCode: HTTPSTATUS.TOO_MANY_REQUESTS,
          },
          timestamp: new Date().toISOString(),
          ...(requestWithContext.requestId ? { requestId: requestWithContext.requestId } : {}),
        });
      },
    });
  }
}

const defaultRateLimiter = new RateLimitMiddlewareFactory({
  max: Math.max(env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_GLOBAL_RATE_LIMIT_MAX_REQUESTS),
});

export const globalRateLimit = defaultRateLimiter.create();

export const authRateLimit = new RateLimitMiddlewareFactory({
  errorCode: ErrorCodeEnum.AUTH_TOO_MANY_ATTEMPTS,
  max: AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many authentication attempts. Please try again later.",
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
}).create();
