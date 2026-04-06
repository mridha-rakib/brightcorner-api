import { describe, expect, it } from "vitest";

import { UserModel } from "../src/modules/users/users.model.js";
import { toPublicUser } from "../src/modules/users/users.utils.js";

describe("toPublicUser", () => {
  it("preserves nested profile and settings fields from mongoose subdocuments", () => {
    const userDocument = new UserModel({
      firstName: "Jane",
      lastName: "Doe",
      fullName: "Jane Doe",
      email: "jane@example.com",
      passwordHash: "hashed-password",
      profile: {
        username: "jane_doe",
        bio: "Builder and tester",
        avatarUrl: "data:image/webp;base64,abc123",
      },
      privacySettings: {
        messagePreference: "contacts",
        anonymousMode: true,
        onlineStatus: false,
        publicProfile: false,
        pinProtection: true,
      },
      notificationSettings: {
        emailNotifications: true,
        channelMentions: false,
        pinAlerts: true,
        joinRequestAlerts: true,
      },
      onboardingCompleted: true,
      isTwoFactorEnabled: true,
    });

    const publicUser = toPublicUser(userDocument);

    expect(publicUser.profile).toEqual({
      username: "jane_doe",
      bio: "Builder and tester",
      avatarUrl: "data:image/webp;base64,abc123",
    });

    expect(publicUser.privacySettings).toEqual({
      messagePreference: "contacts",
      anonymousMode: true,
      onlineStatus: false,
      publicProfile: false,
      pinProtection: true,
    });

    expect(publicUser.notificationSettings).toEqual({
      emailNotifications: true,
      channelMentions: false,
      pinAlerts: true,
      joinRequestAlerts: true,
    });
  });
});
