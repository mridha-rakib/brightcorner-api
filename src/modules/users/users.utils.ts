import type { PublicUser, UserDocument, UserNotificationSettings, UserPrivacySettings } from "@/modules/users/users.type.js";

export const DEFAULT_PRIVACY_SETTINGS: UserPrivacySettings = {
  messagePreference: "everyone",
  anonymousMode: false,
  onlineStatus: true,
  publicProfile: true,
  pinProtection: false,
};

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  emailNotifications: false,
  channelMentions: true,
  pinAlerts: true,
  joinRequestAlerts: false,
};

export function buildFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, "_");
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    profile: { ...user.profile },
    privacySettings: { ...user.privacySettings },
    notificationSettings: { ...user.notificationSettings },
    onboardingCompleted: user.onboardingCompleted,
    isTwoFactorEnabled: user.isTwoFactorEnabled,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
