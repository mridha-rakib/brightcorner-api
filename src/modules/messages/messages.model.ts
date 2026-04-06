import mongoose, { model, Schema } from "mongoose";

import type { Message, MessageAttachment } from "@/modules/messages/messages.type.js";

const attachmentSchema = new Schema<MessageAttachment>({
  id: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  mimeType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 128,
  },
  size: {
    type: Number,
    required: true,
    min: 1,
    max: 2 * 1024 * 1024,
  },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3_000_000,
  },
}, {
  _id: false,
  versionKey: false,
});

const messageSchema = new Schema<Message>({
  attachments: {
    type: [attachmentSchema],
    default: [],
  },
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
    trim: true,
    default: "",
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

export const MessageModel = mongoose.models.Message || model<Message>("Message", messageSchema);
