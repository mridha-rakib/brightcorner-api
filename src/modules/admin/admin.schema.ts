import { z } from "zod/v4";

export const adminUsersQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
  }),
});

export const adminUserParamsSchema = z.object({
  params: z.object({
    userId: z.string().trim().min(1),
  }),
});

export const adminUpdateUserStatusSchema = z.object({
  params: z.object({
    userId: z.string().trim().min(1),
  }),
  body: z.object({
    status: z.enum(["active", "blocked"]),
  }),
});
