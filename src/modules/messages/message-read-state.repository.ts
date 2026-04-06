import type { MessageChatType } from "@/modules/messages/messages.type.js";

import { MessageReadStateModel } from "@/modules/messages/message-read-state.model.js";

export class MessageReadStateRepository {
  listForUser(userId: string) {
    return MessageReadStateModel.find({ userId }).exec();
  }

  findByUserAndChat(input: {
    chatType: MessageChatType;
    chatId: string;
    userId: string;
  }) {
    return MessageReadStateModel.findOne({
      chatId: input.chatId,
      chatType: input.chatType,
      userId: input.userId,
    }).exec();
  }

  upsertReadState(payload: {
    chatType: MessageChatType;
    chatId: string;
    userId: string;
    lastReadAt?: Date;
  }) {
    return MessageReadStateModel.findOneAndUpdate(
      {
        chatId: payload.chatId,
        chatType: payload.chatType,
        userId: payload.userId,
      },
      {
        $set: {
          lastReadAt: payload.lastReadAt ?? new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }
}
