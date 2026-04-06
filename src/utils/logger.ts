import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { inspect } from "node:util";

import { createLogger, format, transports } from "winston";

import { env } from "@/env.js";

export type LogLevel = "error" | "warn" | "info" | "debug";
export type LogMeta = Record<string, unknown>;

type RequestContext = {
  requestId: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

const DATA_URL_PREFIX = "data:";
const REDACTED_VALUE = "[Redacted]";
const CIRCULAR_VALUE = "[Circular]";
const LOG_DIRECTORY = join(process.cwd(), "logs");
const SENSITIVE_KEY_PATTERN = /pass(word)?|secret|token|authorization|cookie|session|api[-_]?key|private[-_]?key/i;
const RESERVED_LOG_KEYS = new Set([
  "timestamp",
  "level",
  "message",
  "service",
  "requestId",
  "stack",
]);

function ensureLogDirectory(): void {
  if (!existsSync(LOG_DIRECTORY))
    mkdirSync(LOG_DIRECTORY, { recursive: true });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function sanitizeString(value: string): string {
  if (value.startsWith(DATA_URL_PREFIX))
    return "[Data URL omitted]";

  return value;
}

function serializeError(error: Error, seen: WeakSet<object>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  const code = Reflect.get(error, "code");
  if (typeof code === "string")
    base.code = code;

  const cause = Reflect.get(error, "cause");
  if (cause !== undefined)
    base.cause = sanitizeValue(cause, "cause", seen);

  return base;
}

function sanitizeValue(
  value: unknown,
  key = "",
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined)
    return value;

  if (typeof value === "string")
    return sanitizeString(value);

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    return value;

  if (value instanceof Date)
    return value.toISOString();

  if (value instanceof Error)
    return serializeError(value, seen);

  if (Buffer.isBuffer(value))
    return `[Buffer ${value.byteLength} bytes]`;

  if (Array.isArray(value))
    return value.map(item => sanitizeValue(item, key, seen));

  if (!isPlainObject(value))
    return String(value);

  if (seen.has(value))
    return CIRCULAR_VALUE;

  seen.add(value);

  const sanitized: Record<string, unknown> = {};

  for (const [childKey, childValue] of Object.entries(value)) {
    sanitized[childKey] = SENSITIVE_KEY_PATTERN.test(childKey)
      ? REDACTED_VALUE
      : sanitizeValue(childValue, childKey, seen);
  }

  seen.delete(value);

  if (SENSITIVE_KEY_PATTERN.test(key))
    return REDACTED_VALUE;

  return sanitized;
}

const injectRequestContext = format((info) => {
  const requestContext = requestContextStorage.getStore();

  if (requestContext?.requestId && !("requestId" in info))
    info.requestId = requestContext.requestId;

  return info;
});

const sanitizeLogInfo = format((info) => {
  for (const [key, value] of Object.entries(info))
    info[key] = sanitizeValue(value, key);

  return info;
});

function createJsonFormat() {
  return format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    injectRequestContext(),
    sanitizeLogInfo(),
    format.json(),
  );
}

function createDevelopmentFormat() {
  return format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.errors({ stack: true }),
    injectRequestContext(),
    sanitizeLogInfo(),
    format.colorize({ all: true }),
    format.printf((info) => {
      const {
        timestamp,
        level,
        message,
        service,
        requestId,
        stack,
      } = info;

      const metadata = Object.fromEntries(
        Object.entries(info).filter(([key]) => !RESERVED_LOG_KEYS.has(key)),
      );

      const prefixParts = [timestamp, `[${service}]`, level];

      if (requestId)
        prefixParts.push(`[${requestId}]`);

      let logLine = `${prefixParts.join(" ")} ${message}`;

      if (stack)
        logLine += `\n${stack}`;

      if (Object.keys(metadata).length > 0)
        logLine += ` ${inspect(metadata, { colors: true, depth: 8, compact: true, breakLength: 120 })}`;

      return logLine;
    }),
  );
}

ensureLogDirectory();

const winstonLogger = createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: {
    service: env.APP_NAME,
    env: env.NODE_ENV,
  },
  transports: [
    new transports.Console({
      format: env.NODE_ENV === "production" ? createJsonFormat() : createDevelopmentFormat(),
    }),
    new transports.File({
      filename: join(LOG_DIRECTORY, "error.log"),
      level: "error",
      format: createJsonFormat(),
    }),
    new transports.File({
      filename: join(LOG_DIRECTORY, "combined.log"),
      format: createJsonFormat(),
    }),
  ],
  exitOnError: false,
});

export type AppLogger = {
  error: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  debug: (message: string, meta?: LogMeta) => void;
  child: (meta?: LogMeta) => AppLogger;
};

function createAppLogger(target = winstonLogger): AppLogger {
  return {
    error: (message, meta) => target.error(message, meta),
    warn: (message, meta) => target.warn(message, meta),
    info: (message, meta) => target.info(message, meta),
    debug: (message, meta) => target.debug(message, meta),
    child: (meta = {}) => createAppLogger(target.child(sanitizeValue(meta) as LogMeta)),
  };
}

export const logger = createAppLogger();

export function runWithRequestContext<T>(requestContext: RequestContext, callback: () => T): T {
  return requestContextStorage.run(requestContext, callback);
}

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}
