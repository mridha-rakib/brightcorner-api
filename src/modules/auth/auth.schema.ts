import { z } from "zod/v4";

export const signUpSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email(),
    password: z.string().min(8),
  }),
});

export const signInSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1),
    password: z.string().min(1),
  }),
});

export const verifySignInTwoFactorSchema = z.object({
  body: z.object({
    challengeToken: z.string().trim().min(1),
    code: z.string().trim().regex(/^\d{6}$/, "Verification code must be 6 digits."),
  }),
});

export const resendSignInTwoFactorSchema = z.object({
  body: z.object({
    challengeToken: z.string().trim().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1),
    password: z.string().min(8),
  }),
});
