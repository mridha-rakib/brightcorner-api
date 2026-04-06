import type {
  PublicUser,
  TwoFactorSettings,
  UserDocument,
  UserNotificationSettings,
  UserPrivacySettings,
} from "@/modules/users/users.type.js";

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

export function maskEmailAddress(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain)
    return email;

  if (localPart.length <= 2)
    return `${localPart[0] ?? "*"}***@${domain}`;

  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function toTwoFactorSettings(user: UserDocument): TwoFactorSettings {
  return {
    deliveryLabel: maskEmailAddress(user.email),
    deliveryMethod: "email",
    enabled: user.isTwoFactorEnabled,
    expiresAt: user.twoFactorCodeExpiresAt ?? null,
    lastSentAt: user.twoFactorLastSentAt ?? null,
  };
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
