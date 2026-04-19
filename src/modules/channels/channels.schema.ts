import { z } from "zod/v4";

import { objectIdSchema } from "@/utils/base-schema.utils.js";

const channelQuestionSchema = z.object({
  text: z.string().trim().min(1).max(200),
  options: z.array(z.string().trim().min(1).max(120)).min(1),
});

const joinAnswerSchema = z.object({
  questionId: z.string().trim().min(1),
  answer: z.string().trim().min(1).max(250),
});

export const listChannelsSchema = z.object({
  query: z.object({
    scope: z.enum(["all", "joined", "discoverable", "owned"]).optional(),
    search: z.string().trim().optional(),
  }),
});

export const channelParamsSchema = z.object({
  params: z.object({
    channelId: objectIdSchema,
  }),
});

export const createChannelSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Channel name must use lowercase letters, numbers, or hyphens."),
    description: z.string().trim().max(250).optional(),
    privacy: z.enum(["public", "private"]),
    iconUrl: z.string().trim().max(2048).optional(),
    questions: z.array(channelQuestionSchema).optional(),
  }),
});

export const createJoinRequestSchema = z.object({
  params: z.object({
    channelId: objectIdSchema,
  }),
  body: z.object({
    answers: z.array(joinAnswerSchema).optional(),
    reason: z.string().trim().max(1000).optional(),
  }),
});

export const joinRequestParamsSchema = z.object({
  params: z.object({
    channelId: objectIdSchema,
    requestId: objectIdSchema,
  }),
});

export const reviewJoinRequestSchema = z.object({
  params: z.object({
    channelId: objectIdSchema,
    requestId: objectIdSchema,
  }),
  body: z.object({
    action: z.enum(["approve", "reject"]),
  }),
});

export const updateChannelSubscriptionSchema = z.object({
  params: z.object({
    channelId: objectIdSchema,
  }),
  body: z.object({
    subscribed: z.boolean(),
  }),
});

export const updateChannelMessagingPermissionsSchema = z.object({
  params: z.object({
    channelId: objectIdSchema,
  }),
  body: z.object({
    membersCanMessage: z.boolean(),
  }),
});
