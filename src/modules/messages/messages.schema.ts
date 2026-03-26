import { z } from "zod/v4";

import { objectIdSchema } from "@/utils/base-schema.utils.js";

const messageTargetShape = {
  channelId: objectIdSchema.optional(),
  conversationId: objectIdSchema.optional(),
} as const;

export const listMessagesSchema = z.object({
  query: z.object({
    ...messageTargetShape,
    pinnedOnly: z.coerce.boolean().optional(),
  }).refine(
    input => Number(Boolean(input.channelId)) + Number(Boolean(input.conversationId)) === 1,
    {
      error: "Provide either channelId or conversationId.",
    },
  ),
});

export const createMessageSchema = z.object({
  body: z.object({
    ...messageTargetShape,
    text: z.string().trim().min(1).max(4000),
    pinned: z.boolean().optional(),
  }).refine(
    input => Number(Boolean(input.channelId)) + Number(Boolean(input.conversationId)) === 1,
    {
      error: "Provide either channelId or conversationId.",
    },
  ),
});
