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

export type MessageReaction = {
  createdAt: Date;
  emoji: string;
  userId: Types.ObjectId;
};

export type MessageReactionSummary = {
  count: number;
  emoji: string;
  reactedUserIds: string[];
};

export type MessageReplySender = Pick<
  PublicUser,
  "firstName" | "fullName" | "id" | "lastName" | "profile"
>;

export type MessageReplyReference = {
  attachments: MessageAttachment[];
  id: string;
  sender: MessageReplySender;
  text: string;
};

export type Message = {
  attachments: MessageAttachment[];
  chatType: MessageChatType;
  chatId: Types.ObjectId;
  createdAt: Date;
  pinned: boolean;
  reactions: MessageReaction[];
  replyToMessageId: Types.ObjectId | null;
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
  reactions: MessageReactionSummary[];
  replyTo: MessageReplyReference | null;
  text: string;
  updatedAt: Date;
  sender: PublicUser;
};

export type MessageListResponse = {
  items: MessageResponse[];
  nextCursor: string | null;
};

export type MessageDocument = HydratedDocument<Message>;
