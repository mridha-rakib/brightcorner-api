import nodemailer from "nodemailer";

import type { MailMessage, MailProvider } from "@/common/mail/mail.types.js";

import { env } from "@/env.js";
import { logger } from "@/middlewares/pino-logger.js";

type PasswordResetMailInput = {
  to: string;
  firstName: string;
  resetToken: string;
};

class StubMailProvider implements MailProvider {
  async send(message: MailMessage): Promise<void> {
    logger.info({ message }, "Stub mail provider intercepted outgoing email.");
  }
}

class SmtpMailProvider implements MailProvider {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  });

  async send(message: MailMessage): Promise<void> {
    if (!env.SMTP_HOST)
      throw new Error("SMTP_HOST is required when EMAIL_PROVIDER is set to smtp.");

    await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      replyTo: env.EMAIL_REPLY_TO,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

class ResendMailProvider implements MailProvider {
  async send(): Promise<void> {
    throw new Error("Resend provider is not implemented yet.");
  }
}

function createMailProvider(): MailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "stub":
      return new StubMailProvider();
    case "smtp":
      return new SmtpMailProvider();
    case "resend":
      return new ResendMailProvider();
    default:
      return new StubMailProvider();
  }
}

export class MailService {
  constructor(private readonly provider: MailProvider = createMailProvider()) {}

  async sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${input.resetToken}`;

    await this.provider.send({
      to: input.to,
      subject: "Reset your Bright Corner password",
      text: [
        `Hello ${input.firstName},`,
        "",
        "We received a request to reset your password.",
        `Use this link to continue: ${resetUrl}`,
        "",
        "If you did not request this change, you can ignore this email.",
      ].join("\n"),
      html: [
        `<p>Hello ${input.firstName},</p>`,
        "<p>We received a request to reset your password.</p>",
        `<p><a href="${resetUrl}">Reset your password</a></p>`,
        "<p>If you did not request this change, you can ignore this email.</p>",
      ].join(""),
    });
  }
}
