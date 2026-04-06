import type { HydratedDocument, Types } from "mongoose";

import type { PublicUser } from "@/modules/users/users.type.js";

export type MessageChatType = "channel" | "conversation";

export type MessageAttachment = {
  id: string;
  mimeType: string;
  name: string;
  size: number;
  url: string;
};

export type Message = {
  attachments: MessageAttachment[];
  chatType: MessageChatType;
  chatId: Types.ObjectId;
  createdAt: Date;
  pinned: boolean;
  senderId: Types.ObjectId;
  text: string;
  updatedAt: Date;
};

export type MessageResponse = {
  attachments: MessageAttachment[];
  id: string;
  chatType: MessageChatType;
  chatId: string;
  createdAt: Date;
  pinned: boolean;
  text: string;
  updatedAt: Date;
  sender: PublicUser;
};

export type MessageDocument = HydratedDocument<Message>;
