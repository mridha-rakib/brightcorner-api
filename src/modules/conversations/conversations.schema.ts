import { z } from "zod/v4";

import { objectIdSchema } from "@/utils/base-schema.utils.js";

export const listConversationsSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
  }),
});

export const conversationParamsSchema = z.object({
  params: z.object({
    conversationId: objectIdSchema,
  }),
});

export const createDirectConversationSchema = z.object({
  body: z.object({
    participantUserId: objectIdSchema,
    pin: z.string().trim().regex(/^\d{4}$/, "PIN must be exactly 4 digits.").optional(),
  }),
});
