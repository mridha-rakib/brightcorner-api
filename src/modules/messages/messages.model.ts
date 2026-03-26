import { model, models, Schema } from "mongoose";

import type { Message } from "@/modules/messages/messages.type.js";

const messageSchema = new Schema<Message>({
  chatType: {
    type: String,
    required: true,
    enum: ["channel", "conversation"],
    index: true,
  },
  chatId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  versionKey: false,
});

messageSchema.index({ chatType: 1, chatId: 1, createdAt: -1 });
messageSchema.index({ chatType: 1, chatId: 1, pinned: 1, createdAt: -1 });

export const MessageModel = models.Message || model<Message>("Message", messageSchema);
