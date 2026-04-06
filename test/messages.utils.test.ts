import { describe, expect, it } from "vitest";

import { MessageModel } from "../src/modules/messages/messages.model.js";
import {
  toMessageReplyReference,
  toMessageResponse,
} from "../src/modules/messages/messages.utils.js";
import type { PublicUser } from "../src/modules/users/users.type.js";

const sender: PublicUser = {
  id: "680000000000000000000001",
  firstName: "Jane",
  lastName: "Doe",
  fullName: "Jane Doe",
  email: "jane@example.com",
  role: "user",
  status: "active",
  profile: {
    username: "jane_doe",
    bio: "Builder",
    avatarUrl: "data:image/webp;base64,avatar",
  },
  privacySettings: {
    messagePreference: "everyone",
    anonymousMode: false,
    onlineStatus: true,
    publicProfile: true,
    pinProtection: false,
  },
  notificationSettings: {
    emailNotifications: true,
    channelMentions: true,
    pinAlerts: true,
    joinRequestAlerts: true,
  },
  onboardingCompleted: true,
  isTwoFactorEnabled: false,
  lastLoginAt: null,
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
};

describe("message serializer", () => {
  it("preserves attachment fields from mongoose subdocuments in message responses", () => {
    const message = new MessageModel({
      chatType: "conversation",
      chatId: "680000000000000000000010",
      senderId: "680000000000000000000001",
      text: "",
      attachments: [
        {
          id: "attachment-1",
          name: "superfly-logo.png",
          mimeType: "image/png",
          size: 9043,
          url: "data:image/png;base64,abc123",
        },
      ],
    });

    const response = toMessageResponse({
      message,
      replyTo: null,
      sender,
    });

    expect(response.attachments).toEqual([
      {
        id: "attachment-1",
        name: "superfly-logo.png",
        mimeType: "image/png",
        size: 9043,
        url: "data:image/png;base64,abc123",
      },
    ]);
  });

  it("preserves attachment fields in reply references", () => {
    const message = new MessageModel({
      chatType: "conversation",
      chatId: "680000000000000000000010",
      senderId: "680000000000000000000001",
      text: "",
      attachments: [
        {
          id: "attachment-2",
          name: "checklist.pdf",
          mimeType: "application/pdf",
          size: 10943,
          url: "data:application/pdf;base64,pdf123",
        },
      ],
    });

    const replyReference = toMessageReplyReference(message, sender);

    expect(replyReference.attachments).toEqual([
      {
        id: "attachment-2",
        name: "checklist.pdf",
        mimeType: "application/pdf",
        size: 10943,
        url: "data:application/pdf;base64,pdf123",
      },
    ]);
  });
});
