import mongoose, { model, Schema } from "mongoose";

import type { MessageReadState } from "@/modules/messages/message-read-state.type.js";

const messageReadStateSchema = new Schema<MessageReadState>({
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
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  lastReadAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, {
  timestamps: true,
  versionKey: false,
});

messageReadStateSchema.index({ chatType: 1, chatId: 1, userId: 1 }, { unique: true });

export const MessageReadStateModel = mongoose.models.MessageReadState
  || model<MessageReadState>("MessageReadState", messageReadStateSchema);
