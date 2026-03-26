import { model, models, Schema } from "mongoose";

import type { Channel, ChannelJoinRequest, ChannelMembership } from "@/modules/channels/channels.type.js";

const questionSchema = new Schema<Channel["questions"][number]>({
  questionId: {
    type: String,
    required: true,
    trim: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  options: {
    type: [String],
    default: [],
  },
}, {
  _id: false,
});

const channelSchema = new Schema<Channel>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 250,
  },
  privacy: {
    type: String,
    required: true,
    enum: ["public", "private"],
  },
  iconUrl: {
    type: String,
    trim: true,
  },
  questions: {
    type: [questionSchema],
    default: [],
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

const channelMembershipSchema = new Schema<ChannelMembership>({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["owner", "admin", "member"],
    default: "member",
  },
}, {
  timestamps: true,
  versionKey: false,
});

channelMembershipSchema.index({ channelId: 1, userId: 1 }, { unique: true });

const joinAnswerSchema = new Schema<ChannelJoinRequest["answers"][number]>({
  questionId: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  _id: false,
});

const channelJoinRequestSchema = new Schema<ChannelJoinRequest>({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  answers: {
    type: [joinAnswerSchema],
    default: [],
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
}, {
  timestamps: true,
  versionKey: false,
});

channelJoinRequestSchema.index({ channelId: 1, userId: 1 }, { unique: true });

export const ChannelModel = models.Channel || model<Channel>("Channel", channelSchema);
export const ChannelMembershipModel = models.ChannelMembership || model<ChannelMembership>("ChannelMembership", channelMembershipSchema);
export const ChannelJoinRequestModel = models.ChannelJoinRequest || model<ChannelJoinRequest>("ChannelJoinRequest", channelJoinRequestSchema);
