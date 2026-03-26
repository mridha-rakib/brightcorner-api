import { randomUUID } from "node:crypto";

import type {
  ChannelDocument,
  ChannelJoinRequestDocument,
  ChannelMembershipDocument,
  ChannelSummary,
} from "@/modules/channels/channels.type.js";

export function normalizeChannelName(name: string): string {
  return name.trim().toLowerCase();
}

export function buildChannelQuestions(
  questions: Array<{ text: string; options: string[] }> | undefined,
) {
  return (questions ?? []).map(question => ({
    questionId: randomUUID(),
    text: question.text.trim(),
    options: question.options.map(option => option.trim()).filter(Boolean),
  }));
}

export function resolveChannelJoinStatus(
  membership: ChannelMembershipDocument | null,
  joinRequest: ChannelJoinRequestDocument | null,
) {
  if (membership)
    return "joined" as const;

  if (joinRequest?.status === "pending")
    return "pending" as const;

  return "not_joined" as const;
}

export function toChannelSummary(input: {
  channel: ChannelDocument;
  membership: ChannelMembershipDocument | null;
  joinRequest: ChannelJoinRequestDocument | null;
  members: number;
  totalAdmins: number;
  lastMessage: string | null;
  lastMessageAt: Date | null;
}): ChannelSummary {
  return {
    id: input.channel.id,
    type: "channel",
    name: input.channel.name,
    description: input.channel.description,
    iconUrl: input.channel.iconUrl,
    isPublic: input.channel.privacy === "public",
    isEncrypted: true,
    joinStatus: resolveChannelJoinStatus(input.membership, input.joinRequest),
    members: input.members,
    totalAdmins: input.totalAdmins,
    online: 0,
    lastMessage: input.lastMessage,
    lastMessageAt: input.lastMessageAt,
  };
}
