import type { HydratedDocument, Types } from "mongoose";

import type { PublicUser } from "@/modules/users/users.type.js";

export type Conversation = {
  participantIds: Types.ObjectId[];
  participantKey: string;
  pinProtected: boolean;
  accessPinHash?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationSummary = {
  id: string;
  type: "dm";
  name: string;
  avatarUrl?: string;
  isEncrypted: true;
  isPinProtected: boolean;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  participant: PublicUser;
};

export type ConversationDetail = ConversationSummary;

export type ConversationDocument = HydratedDocument<Conversation>;
