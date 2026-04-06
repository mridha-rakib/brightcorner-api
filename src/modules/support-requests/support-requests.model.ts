import mongoose, { model, Schema } from "mongoose";

import type { SupportRequest } from "@/modules/support-requests/support-requests.type.js";

const supportRequestSchema = new Schema<SupportRequest>({
  category: {
    type: String,
    required: true,
    enum: ["general_inquiry", "technical_support", "billing_question", "feedback"],
    index: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000,
  },
  status: {
    type: String,
    required: true,
    enum: ["open"],
    default: "open",
    index: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
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

supportRequestSchema.index({ userId: 1, createdAt: -1 });

export const SupportRequestModel = mongoose.models.SupportRequest
  || model<SupportRequest>("SupportRequest", supportRequestSchema);
