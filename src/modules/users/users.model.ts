import mongoose, { model, Schema } from "mongoose";

import type { User } from "@/modules/users/users.type.js";

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from "@/modules/users/users.utils.js";

const profileSchema = new Schema<User["profile"]>({
  username: {
    type: String,
    trim: true,
    lowercase: true,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 1600,
  },
  avatarUrl: {
    type: String,
    trim: true,
  },
}, {
  _id: false,
});

const privacySettingsSchema = new Schema<User["privacySettings"]>({
  messagePreference: {
    type: String,
    enum: ["everyone", "contacts", "nobody"],
    default: DEFAULT_PRIVACY_SETTINGS.messagePreference,
  },
  anonymousMode: {
    type: Boolean,
    default: DEFAULT_PRIVACY_SETTINGS.anonymousMode,
  },
  onlineStatus: {
    type: Boolean,
    default: DEFAULT_PRIVACY_SETTINGS.onlineStatus,
  },
  publicProfile: {
    type: Boolean,
    default: DEFAULT_PRIVACY_SETTINGS.publicProfile,
  },
  pinProtection: {
    type: Boolean,
    default: DEFAULT_PRIVACY_SETTINGS.pinProtection,
  },
}, {
  _id: false,
});

const notificationSettingsSchema = new Schema<User["notificationSettings"]>({
  emailNotifications: {
    type: Boolean,
    default: DEFAULT_NOTIFICATION_SETTINGS.emailNotifications,
  },
  channelMentions: {
    type: Boolean,
    default: DEFAULT_NOTIFICATION_SETTINGS.channelMentions,
  },
  pinAlerts: {
    type: Boolean,
    default: DEFAULT_NOTIFICATION_SETTINGS.pinAlerts,
  },
  joinRequestAlerts: {
    type: Boolean,
    default: DEFAULT_NOTIFICATION_SETTINGS.joinRequestAlerts,
  },
}, {
  _id: false,
});

const userSchema = new Schema<User>({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  status: {
    type: String,
    enum: ["active", "blocked"],
    default: "active",
  },
  profile: {
    type: profileSchema,
    default: () => ({}),
  },
  privacySettings: {
    type: privacySettingsSchema,
    default: () => ({ ...DEFAULT_PRIVACY_SETTINGS }),
  },
  notificationSettings: {
    type: notificationSettingsSchema,
    default: () => ({ ...DEFAULT_NOTIFICATION_SETTINGS }),
  },
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  isTwoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorCodeHash: {
    type: String,
    trim: true,
    select: false,
  },
  twoFactorCodeExpiresAt: {
    type: Date,
    default: null,
    select: false,
  },
  twoFactorLastSentAt: {
    type: Date,
    default: null,
    select: false,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  versionKey: false,
});

userSchema.index({ "profile.username": 1 }, { unique: true, sparse: true });

export const UserModel = mongoose.models.User || model<User>("User", userSchema);
