import { describe, expect, it, vi } from "vitest";

import { MessagesService } from "../src/modules/messages/messages.service.js";
import { ForbiddenException } from "../src/utils/app-error.utils.js";

const channelId = "680000000000000000000010";
const userId = "680000000000000000000001";

describe("MessagesService channel permissions", () => {
  it("blocks normal members from sending channel messages when member messaging is disabled", async () => {
    const messagesRepository = {
      createMessage: vi.fn(),
    };
    const channelsRepository = {
      findById: vi.fn().mockResolvedValue({
        id: channelId,
        membersCanMessage: false,
      }),
      findMembership: vi.fn().mockResolvedValue({
        role: "member",
      }),
    };

    const service = new MessagesService(
      messagesRepository as never,
      {} as never,
      {} as never,
      channelsRepository as never,
    );

    await expect(
      service.createMessage(userId, {
        channelId,
        text: "Can I post?",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messagesRepository.createMessage).not.toHaveBeenCalled();
  });

  it("allows normal members to send channel messages when member messaging is enabled", async () => {
    const createdMessage = {
      attachments: [],
      chatId: channelId,
      chatType: "channel",
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      id: "680000000000000000000020",
      pinned: false,
      reactions: [],
      replyToMessageId: null,
      senderId: userId,
      text: "I can post now",
      updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    };
    const sender = {
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      email: "member@example.com",
      firstName: "Member",
      fullName: "Member User",
      id: userId,
      isTwoFactorEnabled: false,
      lastLoginAt: null,
      lastName: "User",
      notificationSettings: {
        channelMentions: true,
        emailNotifications: false,
        joinRequestAlerts: false,
        pinAlerts: true,
      },
      onboardingCompleted: true,
      privacySettings: {
        anonymousMode: false,
        messagePreference: "everyone",
        onlineStatus: true,
        pinProtection: false,
        publicProfile: true,
      },
      profile: {},
      role: "user",
      status: "active",
      updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    };
    const messagesRepository = {
      createMessage: vi.fn().mockResolvedValue(createdMessage),
      findManyByIds: vi.fn().mockResolvedValue([]),
    };
    const usersRepository = {
      findManyByIds: vi.fn().mockResolvedValue([sender]),
    };
    const channelsRepository = {
      findById: vi.fn().mockResolvedValue({
        id: channelId,
        membersCanMessage: true,
      }),
      findMembership: vi.fn().mockResolvedValue({
        role: "member",
      }),
      touchChannel: vi.fn().mockResolvedValue(undefined),
    };
    const notificationsService = {
      notifyMessageCreated: vi.fn().mockResolvedValue(undefined),
    };

    const service = new MessagesService(
      messagesRepository as never,
      {} as never,
      usersRepository as never,
      channelsRepository as never,
      {} as never,
      {} as never,
      notificationsService as never,
    );

    const message = await service.createMessage(userId, {
      channelId,
      text: "I can post now",
    });

    expect(message.text).toBe("I can post now");
    expect(messagesRepository.createMessage).toHaveBeenCalledTimes(1);
  });
});
