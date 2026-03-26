import type {
  UserNotificationSettings,
  UserPrivacySettings,
} from "@/modules/users/users.type.js";

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
};

export type UpdateUserProfileInput = {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
};

export type CompleteOnboardingInput = {
  username: string;
  bio?: string;
  avatarUrl?: string;
  privacySettings?: Partial<UserPrivacySettings>;
  notificationSettings?: Partial<UserNotificationSettings>;
};

export type UpdatePrivacySettingsInput = Partial<UserPrivacySettings>;
export type UpdateNotificationSettingsInput = Partial<UserNotificationSettings>;
