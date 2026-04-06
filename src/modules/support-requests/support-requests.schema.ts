import { z } from "zod/v4";

export const createSupportRequestSchema = z.object({
  body: z.object({
    category: z.enum([
      "general_inquiry",
      "technical_support",
      "billing_question",
      "feedback",
    ]),
    email: z.string().trim().email(),
    fullName: z.string().trim().min(1).max(160),
    message: z.string().trim().min(10).max(4000),
    subject: z.string().trim().min(1).max(200),
  }),
});
