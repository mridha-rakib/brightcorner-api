import type { NextFunction, Request, Response } from "express";

import { randomUUID } from "node:crypto";

import { logger, runWithRequestContext } from "@/utils/logger.js";

type RequestLoggerOptions = {
  enableLogging?: boolean;
};

function resolveRequestId(candidate: string | string[] | undefined): string {
  if (typeof candidate === "string" && candidate.trim().length > 0)
    return candidate.trim();

  if (Array.isArray(candidate)) {
    const firstValue = candidate.find(value => value.trim().length > 0);
    if (firstValue)
      return firstValue.trim();
  }

  return randomUUID();
}

function shouldSkipLogging(request: Request): boolean {
  const pathname = request.originalUrl.split("?")[0] ?? request.originalUrl;
  return pathname === "/health";
}

function getLogLevel(statusCode: number): "error" | "warn" | "info" {
  if (statusCode >= 500)
    return "error";

  if (statusCode >= 400)
    return "warn";

  return "info";
}

function getResponseTimeInMs(startTime: bigint): number {
  const elapsed = Number(process.hrtime.bigint() - startTime) / 1_000_000;
  return Number(elapsed.toFixed(2));
}

export function createRequestLoggerMiddleware(
  options: RequestLoggerOptions = {},
) {
  const enableLogging = options.enableLogging ?? true;

  return (request: Request, response: Response, next: NextFunction): void => {
    const requestId = resolveRequestId(request.headers["x-request-id"]);

    request.id = requestId;
    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);

    const startTime = process.hrtime.bigint();
    const skipLogging = !enableLogging || shouldSkipLogging(request);

    runWithRequestContext({ requestId }, () => {
      response.once("finish", () => {
        if (skipLogging)
          return;

        const logLevel = getLogLevel(response.statusCode);

        logger[logLevel](`${request.method} ${request.originalUrl} -> ${response.statusCode}`, {
          requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          responseTimeMs: getResponseTimeInMs(startTime),
          ip: request.ip,
          userAgent: request.get("user-agent"),
        });
      });

      response.once("close", () => {
        if (skipLogging || response.writableEnded)
          return;

        logger.warn(`${request.method} ${request.originalUrl} -> aborted`, {
          requestId,
          method: request.method,
          path: request.originalUrl,
          ip: request.ip,
          userAgent: request.get("user-agent"),
        });
      });

      next();
    });
  };
}
