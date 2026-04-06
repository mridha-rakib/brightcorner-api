import mongoose, { model, Schema } from "mongoose";

import type { Conversation } from "@/modules/conversations/conversations.type.js";

const conversationSchema = new Schema<Conversation>({
  participantIds: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    required: true,
    validate: {
      validator: (participantIds: unknown[]) => participantIds.length === 2,
      message: "A direct conversation must include exactly two participants.",
    },
  },
  participantKey: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true,
  },
  pinProtected: {
    type: Boolean,
    default: false,
  },
  accessPinHash: {
    type: String,
    trim: true,
    select: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

conversationSchema.index({ participantIds: 1 });

export const ConversationModel = mongoose.models.Conversation || model<Conversation>("Conversation", conversationSchema);
