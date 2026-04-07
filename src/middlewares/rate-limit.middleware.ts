import type { Request, Response } from "express";

import rateLimit from "express-rate-limit";

import { HTTPSTATUS } from "@/config/http.config.js";
import { ErrorCodeEnum } from "@/enums/error-code.enum.js";
import { env } from "@/env.js";
import type { RequestWithContext } from "@/middlewares/request-context.types.js";
import { logger } from "@/utils/logger.js";

export type RateLimitOptions = {
  windowMs?: number;
  max?: number;
};

export class RateLimitMiddlewareFactory {
  private readonly windowMs: number;
  private readonly max: number;

  constructor(options: RateLimitOptions = {}) {
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
            code: ErrorCodeEnum.AUTH_TOO_MANY_ATTEMPTS,
            message: "Too many requests from this IP. Please try again later.",
            statusCode: HTTPSTATUS.TOO_MANY_REQUESTS,
          },
          timestamp: new Date().toISOString(),
          ...(requestWithContext.requestId ? { requestId: requestWithContext.requestId } : {}),
        });
      },
    });
  }
}

const defaultRateLimiter = new RateLimitMiddlewareFactory();

export const globalRateLimit = defaultRateLimiter.create();
