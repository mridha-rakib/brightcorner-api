import type { HydratedDocument, Types } from "mongoose";

import type { MessageChatType } from "@/modules/messages/messages.type.js";

export type MessageReadState = {
  chatType: MessageChatType;
  chatId: Types.ObjectId;
  userId: Types.ObjectId;
  lastReadAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageReadStateDocument = HydratedDocument<MessageReadState>;
