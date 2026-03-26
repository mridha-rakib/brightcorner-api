import { createHash, randomBytes, randomUUID } from "node:crypto";

export function createPasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createSessionId(): string {
  return randomUUID();
}
