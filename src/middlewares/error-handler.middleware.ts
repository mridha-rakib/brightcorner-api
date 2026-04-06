import type { NextFunction, Request, Response } from "express";

import { ZodError } from "zod/v4";

import { HTTPSTATUS } from "@/config/http.config.js";
import { ErrorCodeEnum } from "@/enums/error-code.enum.js";
import { env } from "@/env.js";
import { AppError } from "@/utils/app-error.utils.js";
import { logger } from "@/utils/logger.js";

type ErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
  timestamp: string;
  path: string;
  requestId?: string;
  stack?: string;
};

type RequestParsingError = Error & {
  type?: string;
  status?: number;
  statusCode?: number;
  limit?: number;
  length?: number;
};

function isPayloadTooLargeError(error: unknown): error is RequestParsingError {
  return error instanceof Error
    && (
      (error as RequestParsingError).type === "entity.too.large"
      || error.name === "PayloadTooLargeError"
    );
}

function isInvalidRequestFormatError(error: unknown): error is RequestParsingError {
  return error instanceof Error
    && (error as RequestParsingError).type === "entity.parse.failed";
}

function buildErrorPayload(
  req: Request,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
  stack?: string,
): ErrorPayload {
  const requestId = req.requestId ?? req.id;

  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    ...(requestId ? { requestId } : {}),
    ...(stack ? { stack } : {}),
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent)
    return;

  if (isPayloadTooLargeError(err)) {
    logger.warn("Request payload too large", {
      path: req.originalUrl,
      requestId: req.requestId,
      limit: err.limit,
      length: err.length,
    });

    const payload = buildErrorPayload(
      req,
      HTTPSTATUS.PAYLOAD_TOO_LARGE,
      ErrorCodeEnum.REQUEST_TOO_LARGE,
      "Request payload is too large.",
      err.limit
        ? [{ path: "body", message: `Payload exceeds the configured limit of ${err.limit} bytes.` }]
        : undefined,
      env.NODE_ENV === "production" ? undefined : err.stack,
    );

    res.status(HTTPSTATUS.PAYLOAD_TOO_LARGE).json(payload);
    return;
  }

  if (isInvalidRequestFormatError(err)) {
    logger.warn("Invalid request payload format", {
      path: req.originalUrl,
      requestId: req.requestId,
      error: err.message,
    });

    const payload = buildErrorPayload(
      req,
      HTTPSTATUS.BAD_REQUEST,
      ErrorCodeEnum.INVALID_REQUEST_FORMAT,
      "Invalid request payload format.",
      undefined,
      env.NODE_ENV === "production" ? undefined : err.stack,
    );

    res.status(HTTPSTATUS.BAD_REQUEST).json(payload);
    return;
  }

  if (err instanceof ZodError) {
    const payload = buildErrorPayload(
      req,
      HTTPSTATUS.BAD_REQUEST,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Validation failed",
      err.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
      env.NODE_ENV === "production" ? undefined : err.stack,
    );

    res.status(HTTPSTATUS.BAD_REQUEST).json(payload);
    return;
  }

  if (err instanceof AppError) {
    const payload = buildErrorPayload(
      req,
      err.statusCode,
      err.errorCode ?? ErrorCodeEnum.INTERNAL_SERVER_ERROR,
      err.message,
      err.details,
      env.NODE_ENV === "production" ? undefined : err.stack,
    );

    if (err.statusCode >= HTTPSTATUS.INTERNAL_SERVER_ERROR) {
      logger.error("Unhandled application error", {
        error: err,
        path: req.originalUrl,
        requestId: req.requestId,
      });
    }

    res.status(err.statusCode).json(payload);
    return;
  }

  const unknownError = err instanceof Error ? err : new Error("Unknown error");
  logger.error("Unhandled server error", {
    error: unknownError,
    path: req.originalUrl,
    requestId: req.requestId,
  });

  const payload = buildErrorPayload(
    req,
    HTTPSTATUS.INTERNAL_SERVER_ERROR,
    ErrorCodeEnum.INTERNAL_SERVER_ERROR,
    "Internal server error",
    undefined,
    env.NODE_ENV === "production" ? undefined : unknownError.stack,
  );

  res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json(payload);
}
