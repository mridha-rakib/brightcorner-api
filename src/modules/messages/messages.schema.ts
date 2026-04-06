import { z } from "zod/v4";

import { objectIdSchema } from "@/utils/base-schema.utils.js";

const attachmentSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  size: z.number().int().min(1).max(2 * 1024 * 1024),
  url: z.string().trim().min(1).max(3_000_000),
});

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
    attachments: z.array(attachmentSchema).max(4).optional().default([]),
    pinned: z.boolean().optional(),
    text: z.string().trim().max(4000).optional().default(""),
  }).refine(
    input => Number(Boolean(input.channelId)) + Number(Boolean(input.conversationId)) === 1,
    {
      error: "Provide either channelId or conversationId.",
    },
  ).refine(
    input => input.text.trim().length > 0 || input.attachments.length > 0,
    {
      error: "A message must include text or at least one attachment.",
      path: ["text"],
    },
  ),
});
