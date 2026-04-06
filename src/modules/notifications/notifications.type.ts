import type { HydratedDocument, Types } from "mongoose";

export type NotificationType = "mention" | "message" | "following" | "reaction";

export type Notification = {
  actorAvatarUrl?: string;
  actorName: string;
  chatId?: string;
  chatType?: "channel" | "conversation";
  content: string;
  createdAt: Date;
  readAt: Date | null;
  type: NotificationType;
  updatedAt: Date;
  userId: Types.ObjectId;
};

export type NotificationResponse = {
  content: string;
  createdAt: Date;
  id: string;
  isRead: boolean;
  type: NotificationType;
  user: {
    avatar?: string;
    name: string;
  };
};

export type NotificationDocument = HydratedDocument<Notification>;
