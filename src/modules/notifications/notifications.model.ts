import mongoose, { model, Schema } from "mongoose";

import type { Notification } from "@/modules/notifications/notifications.type.js";

const notificationSchema = new Schema<Notification>({
  actorAvatarUrl: {
    type: String,
    trim: true,
  },
  actorName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
  },
  chatId: {
    type: String,
    trim: true,
  },
  chatType: {
    type: String,
    enum: ["channel", "conversation"],
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 600,
  },
  readAt: {
    type: Date,
    default: null,
  },
  type: {
    type: String,
    required: true,
    enum: ["mention", "message", "following", "reaction"],
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const NotificationModel = mongoose.models.Notification
  || model<Notification>("Notification", notificationSchema);
