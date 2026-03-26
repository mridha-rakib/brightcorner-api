import type { MessageChatType } from "@/modules/messages/messages.type.js";

import { MessageModel } from "@/modules/messages/messages.model.js";

export class MessagesRepository {
  createMessage(payload: {
    chatType: MessageChatType;
    chatId: string;
    senderId: string;
    text: string;
    pinned: boolean;
  }) {
    return MessageModel.create(payload);
  }

  listMessages(input: {
    chatType: MessageChatType;
    chatId: string;
    pinnedOnly?: boolean;
  }) {
    return MessageModel.find({
      chatType: input.chatType,
      chatId: input.chatId,
      ...(input.pinnedOnly ? { pinned: true } : {}),
    })
      .sort({ createdAt: 1 })
      .exec();
  }

  findLatestMessage(input: {
    chatType: MessageChatType;
    chatId: string;
  }) {
    return MessageModel.findOne({
      chatType: input.chatType,
      chatId: input.chatId,
    })
      .sort({ createdAt: -1 })
      .exec();
  }
}
