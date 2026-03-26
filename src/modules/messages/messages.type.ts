import type { HydratedDocument, Types } from "mongoose";

import type { PublicUser } from "@/modules/users/users.type.js";

export type MessageChatType = "channel" | "conversation";

export type Message = {
  chatType: MessageChatType;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  text: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageResponse = {
  id: string;
  chatType: MessageChatType;
  chatId: string;
  text: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: PublicUser;
};

export type MessageDocument = HydratedDocument<Message>;
