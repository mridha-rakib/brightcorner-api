import { z } from "zod/v4";

const legalContentTypeSchema = z.enum(["privacy", "terms", "about"]);

export const legalContentParamsSchema = z.object({
  params: z.object({
    type: legalContentTypeSchema,
  }),
});

export const upsertLegalContentSchema = z.object({
  params: z.object({
    type: legalContentTypeSchema,
  }),
  body: z.object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1),
  }),
});
