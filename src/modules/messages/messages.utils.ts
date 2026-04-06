import type {
  MessageAttachment,
  MessageDocument,
  MessageReaction,
  MessageReplyReference,
  MessageReplySender,
  MessageResponse,
} from "@/modules/messages/messages.type.js";
import type { PublicUser } from "@/modules/users/users.type.js";

import { BadRequestException } from "@/utils/app-error.utils.js";

function toMessageAttachment(attachment: MessageDocument["attachments"][number]): MessageAttachment {
  return {
    id: attachment.id,
    mimeType: attachment.mimeType,
    name: attachment.name,
    size: attachment.size,
    url: attachment.url,
  };
}

export function resolveMessageTarget(input: {
  channelId?: string;
  conversationId?: string;
}) {
  if (input.channelId && input.conversationId) {
    throw new BadRequestException("Provide either a channelId or a conversationId, not both.");
  }

  if (!input.channelId && !input.conversationId) {
    throw new BadRequestException("A channelId or conversationId is required.");
  }

  if (input.channelId) {
    return {
      chatType: "channel" as const,
      chatId: input.channelId,
    };
  }

  return {
    chatType: "conversation" as const,
    chatId: input.conversationId!,
  };
}

export function toMessageResponse(input: {
  message: MessageDocument;
  replyTo: MessageReplyReference | null;
  sender: PublicUser;
}): MessageResponse {
  return {
    attachments: input.message.attachments?.map(toMessageAttachment) ?? [],
    id: input.message.id,
    chatType: input.message.chatType,
    chatId: String(input.message.chatId),
    createdAt: input.message.createdAt,
    pinned: input.message.pinned,
    reactions: summarizeMessageReactions(input.message.reactions ?? []),
    replyTo: input.replyTo,
    text: input.message.text,
    updatedAt: input.message.updatedAt,
    sender: input.sender,
  };
}

export function toMessageReplyReference(
  message: MessageDocument,
  sender: PublicUser,
): MessageReplyReference {
  return {
    attachments: message.attachments?.map(toMessageAttachment) ?? [],
    id: message.id,
    sender: toMessageReplySender(sender),
    text: message.text,
  };
}

export function toMessageReplySender(sender: PublicUser): MessageReplySender {
  return {
    firstName: sender.firstName,
    fullName: sender.fullName,
    id: sender.id,
    lastName: sender.lastName,
    profile: { ...sender.profile },
  };
}

export function resolveMessagePreview(
  message?: {
    attachments?: Array<{ name: string }>;
    text?: string | null;
  } | null,
): string | null {
  const text = message?.text?.trim();
  if (text)
    return text;

  if (message?.attachments?.length)
    return `Shared ${message.attachments.length > 1 ? "attachments" : message.attachments[0].name}`;

  return null;
}

function summarizeMessageReactions(reactions: MessageReaction[]): MessageResponse["reactions"] {
  const groupedReactions = new Map<string, Set<string>>();

  for (const reaction of reactions) {
    const users = groupedReactions.get(reaction.emoji) ?? new Set<string>();
    users.add(String(reaction.userId));
    groupedReactions.set(reaction.emoji, users);
  }

  return [...groupedReactions.entries()]
    .map(([emoji, userIds]) => ({
      count: userIds.size,
      emoji,
      reactedUserIds: [...userIds],
    }))
    .sort((firstReaction, secondReaction) => firstReaction.emoji.localeCompare(secondReaction.emoji));
}
