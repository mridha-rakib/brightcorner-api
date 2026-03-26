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
    id: input.message.id,
    chatType: input.message.chatType,
    chatId: String(input.message.chatId),
    text: input.message.text,
    pinned: input.message.pinned,
    createdAt: input.message.createdAt,
    updatedAt: input.message.updatedAt,
    sender: input.sender,
  };
}
