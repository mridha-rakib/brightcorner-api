import { z } from "zod/v4";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[\w-]+$/, "Username can only include letters, numbers, underscores, and hyphens");

const privacySettingsSchema = z.object({
  messagePreference: z.enum(["everyone", "contacts", "nobody"]).optional(),
  anonymousMode: z.boolean().optional(),
  onlineStatus: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
  pinProtection: z.boolean().optional(),
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  channelMentions: z.boolean().optional(),
  pinAlerts: z.boolean().optional(),
  joinRequestAlerts: z.boolean().optional(),
});

function requireAtLeastOneField<TSchema extends z.ZodRawShape>(shape: TSchema) {
  return z.object(shape).refine(
    value => Object.values(value).some(item => item !== undefined),
    "At least one field must be provided.",
  );
}

export const onboardingSchema = z.object({
  body: z.object({
    username: usernameSchema,
    bio: z.string().trim().max(1600).optional(),
    avatarUrl: z.string().trim().max(2048).optional(),
    privacySettings: privacySettingsSchema.optional(),
    notificationSettings: notificationSettingsSchema.optional(),
  }),
});

export const directoryQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
  }),
});

export const profileUpdateSchema = z.object({
  body: requireAtLeastOneField({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(1600).optional(),
    avatarUrl: z.string().trim().max(2048).optional(),
  }),
});

export const privacySettingsUpdateSchema = z.object({
  body: requireAtLeastOneField({
    messagePreference: z.enum(["everyone", "contacts", "nobody"]).optional(),
    anonymousMode: z.boolean().optional(),
    onlineStatus: z.boolean().optional(),
    publicProfile: z.boolean().optional(),
    pinProtection: z.boolean().optional(),
  }),
});

export const notificationSettingsUpdateSchema = z.object({
  body: requireAtLeastOneField({
    emailNotifications: z.boolean().optional(),
    channelMentions: z.boolean().optional(),
    pinAlerts: z.boolean().optional(),
    joinRequestAlerts: z.boolean().optional(),
  }),
});

export const changeEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().trim().email(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1),
  }),
});
