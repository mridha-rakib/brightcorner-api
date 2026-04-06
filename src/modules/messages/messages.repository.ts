import mongoose from "mongoose";

import type {
  MessageAttachment,
  MessageChatType,
  MessageDocument,
} from "@/modules/messages/messages.type.js";

import { MessageModel } from "@/modules/messages/messages.model.js";

export class MessagesRepository {
  createMessage(payload: {
    attachments: MessageAttachment[];
    chatType: MessageChatType;
    chatId: string;
    pinned: boolean;
    replyToMessageId?: string;
    senderId: string;
    text: string;
  }) {
    return MessageModel.create(payload);
  }

  async listMessagesPage(input: {
    beforeMessageId?: string;
    chatType: MessageChatType;
    chatId: string;
    limit: number;
    pinnedOnly?: boolean;
  }) {
    const filters: {
      $or?: Array<Record<string, unknown>>;
      chatId: string;
      chatType: MessageChatType;
      pinned?: true;
    } = {
      chatType: input.chatType,
      chatId: input.chatId,
      ...(input.pinnedOnly ? { pinned: true } : {}),
    };

    if (input.beforeMessageId) {
      const cursorMessage = await MessageModel.findById(input.beforeMessageId)
        .select({ _id: 1, chatId: 1, chatType: 1, createdAt: 1 })
        .exec();

      if (
        !cursorMessage
        || cursorMessage.chatType !== input.chatType
        || String(cursorMessage.chatId) !== input.chatId
      ) {
        return {
          hasMore: false,
          items: [] as MessageDocument[],
        };
      }

      filters.$or = [
        {
          createdAt: { $lt: cursorMessage.createdAt },
        },
        {
          _id: { $lt: new mongoose.Types.ObjectId(input.beforeMessageId) },
          createdAt: cursorMessage.createdAt,
        },
      ];
    }

    const messages = await MessageModel.find(filters)
      .sort({ createdAt: -1, _id: -1 })
      .limit(input.limit + 1)
      .exec();

    return {
      hasMore: messages.length > input.limit,
      items: messages.slice(0, input.limit),
    };
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

  countUnreadMessages(input: {
    chatType: MessageChatType;
    chatId: string;
    userId: string;
    lastReadAt?: Date | null;
  }) {
    return MessageModel.countDocuments({
      chatId: input.chatId,
      chatType: input.chatType,
      ...(input.lastReadAt ? { createdAt: { $gt: input.lastReadAt } } : {}),
      senderId: { $ne: input.userId },
    }).exec();
  }

  findById(messageId: string) {
    return MessageModel.findById(messageId).exec();
  }

  findManyByIds(messageIds: string[]) {
    if (messageIds.length === 0)
      return Promise.resolve([] as MessageDocument[]);

    return MessageModel.find({
      _id: { $in: messageIds },
    }).exec();
  }

  save(message: MessageDocument) {
    return message.save();
  }
}
