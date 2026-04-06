import type { MessageDocument, MessageResponse } from "@/modules/messages/messages.type.js";
import type { PublicUser } from "@/modules/users/users.type.js";

import { BadRequestException } from "@/utils/app-error.utils.js";

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
  sender: PublicUser;
}): MessageResponse {
  return {
    attachments: input.message.attachments?.map(attachment => ({ ...attachment })) ?? [],
    id: input.message.id,
    chatType: input.message.chatType,
    chatId: String(input.message.chatId),
    createdAt: input.message.createdAt,
    pinned: input.message.pinned,
    text: input.message.text,
    updatedAt: input.message.updatedAt,
    sender: input.sender,
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
