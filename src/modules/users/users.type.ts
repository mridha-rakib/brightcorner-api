import type { HydratedDocument } from "mongoose";

import type { AuthRole } from "@/common/auth/auth.types.js";

export type UserStatus = "active" | "blocked";
export type MessagePreference = "everyone" | "contacts" | "nobody";

export type UserProfile = {
  username?: string;
  bio?: string;
  avatarUrl?: string;
};

export type UserPrivacySettings = {
  messagePreference: MessagePreference;
  anonymousMode: boolean;
  onlineStatus: boolean;
  publicProfile: boolean;
  pinProtection: boolean;
};

export type UserNotificationSettings = {
  emailNotifications: boolean;
  channelMentions: boolean;
  pinAlerts: boolean;
  joinRequestAlerts: boolean;
};

export type User = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: AuthRole;
  status: UserStatus;
  profile: UserProfile;
  privacySettings: UserPrivacySettings;
  notificationSettings: UserNotificationSettings;
  onboardingCompleted: boolean;
  isTwoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: AuthRole;
  status: UserStatus;
  profile: UserProfile;
  privacySettings: UserPrivacySettings;
  notificationSettings: UserNotificationSettings;
  onboardingCompleted: boolean;
  isTwoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocument = HydratedDocument<User>;
