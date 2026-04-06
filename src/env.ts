import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

const logLevelSchema = z.enum(["error", "warn", "info", "debug"]);

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(value: string): string {
  if (!value.startsWith("/")) return `/${value}`;

  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function getRuntimeEnv(): NodeJS.ProcessEnv {
  return globalThis.process?.env ?? {};
}

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_NAME: z.string().trim().min(1).default("Bright Corner API"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    BASE_URL: z
      .string()
      .trim()
      .min(1)
      .default("/api/v1")
      .transform(normalizeBaseUrl),
    CLIENT_URL: z.string().trim().url().default("http://localhost:3000"),
    LOG_LEVEL: logLevelSchema.default("info"),
    JSON_BODY_LIMIT: z.string().trim().default("10mb"),
    URL_ENCODED_LIMIT: z.string().trim().default("10mb"),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:3001")
      .transform(parseCsv),
    TRUST_PROXY: z.stringbool().default(false),
    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),
    ENABLE_SWAGGER: z.stringbool().default(true),
    ENABLE_REQUEST_LOGGING: z.stringbool().default(true),
    MONGO_URI: z
      .string()
      .trim()
      .min(1, "MONGO_URI is required")
      .default("mongodb://127.0.0.1:27017/bright-corner"),
    MONGO_DB_NAME: z.string().trim().min(1).optional(),
    JWT_SECRET: z
      .string()
      .trim()
      .min(16, "JWT_SECRET must be at least 16 characters")
      .default("change_me_jwt_access_secret"),
    JWT_REFRESH_SECRET: z
      .string()
      .trim()
      .min(16, "JWT_REFRESH_SECRET must be at least 16 characters")
      .default("change_me_jwt_refresh_secret"),
    COOKIE_SECRET: z
      .string()
      .trim()
      .min(16, "COOKIE_SECRET must be at least 16 characters")
      .default("change_me_cookie_secret"),
    PASSWORD_PEPPER: z
      .string()
      .trim()
      .min(1, "PASSWORD_PEPPER is required")
      .default("change_me_password_pepper"),
    AWS_REGION: z.string().trim().min(1).optional(),
    AWS_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
    AWS_S3_BUCKET: z.string().trim().min(1).optional(),
    AWS_S3_UPLOAD_PREFIX: z.string().trim().default("uploads"),
    EMAIL_PROVIDER: z.enum(["stub", "smtp", "resend"]).default("smtp"),
    EMAIL_FROM: z.string().trim().email().default("noreply@brightcorner.local"),
    EMAIL_REPLY_TO: z.string().trim().email().optional(),
    SMTP_HOST: z.string().trim().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().trim().min(1).optional(),
    SMTP_PASS: z.string().trim().min(1).optional(),
    ADMIN_SEED_EMAIL: z.string().trim().email().optional(),
    ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
    ADMIN_SEED_FIRST_NAME: z.string().trim().min(1).default("Blaise"),
    ADMIN_SEED_LAST_NAME: z.string().trim().min(1).default("Temateh"),
  },
  runtimeEnv: getRuntimeEnv(),
  emptyStringAsUndefined: true,
});

if (Boolean(env.ADMIN_SEED_EMAIL) !== Boolean(env.ADMIN_SEED_PASSWORD)) {
  throw new Error(
    "ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be provided together.",
  );
}

if (env.EMAIL_PROVIDER === "smtp" && env.NODE_ENV === "production") {
  const missingSmtpKeys = [
    ["SMTP_HOST", env.SMTP_HOST],
    ["SMTP_USER", env.SMTP_USER],
    ["SMTP_PASS", env.SMTP_PASS],
  ].filter(([, value]) => !value);

  if (missingSmtpKeys.length > 0) {
    throw new Error(
      `Missing SMTP configuration: ${missingSmtpKeys.map(([key]) => key).join(", ")}`,
    );
  }
}

if (
  env.AWS_S3_BUCKET &&
  (!env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY)
) {
  throw new Error(
    "AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are required when AWS_S3_BUCKET is configured.",
  );
}

export type Env = typeof env;
