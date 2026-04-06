import type { ChannelJoinAnswer, ChannelMembershipRole } from "@/modules/channels/channels.type.js";

import {
  ChannelJoinRequestModel,
  ChannelMembershipModel,
  ChannelModel,
} from "@/modules/channels/channels.model.js";

export class ChannelsRepository {
  createChannel(payload: {
    name: string;
    description?: string;
    privacy: "public" | "private";
    iconUrl?: string;
    questions: Array<{
      questionId: string;
      text: string;
      options: string[];
    }>;
    createdBy: string;
  }) {
    return ChannelModel.create(payload);
  }

  findById(channelId: string) {
    return ChannelModel.findById(channelId).exec();
  }

  findByName(name: string) {
    return ChannelModel.findOne({ name }).exec();
  }

  listChannels(search?: string) {
    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    return ChannelModel.find(searchFilter).sort({ updatedAt: -1 }).exec();
  }

  createMembership(payload: {
    channelId: string;
    userId: string;
    role: ChannelMembershipRole;
    subscribed?: boolean;
  }) {
    return ChannelMembershipModel.create(payload);
  }

  findMembership(channelId: string, userId: string) {
    return ChannelMembershipModel.findOne({ channelId, userId }).exec();
  }

  findMembershipsForUser(userId: string) {
    return ChannelMembershipModel.find({ userId }).exec();
  }

  listMemberships(channelId: string) {
    return ChannelMembershipModel.find({ channelId }).sort({ createdAt: 1 }).exec();
  }

  countMemberships(channelId: string) {
    return ChannelMembershipModel.countDocuments({ channelId }).exec();
  }

  countAdmins(channelId: string) {
    return ChannelMembershipModel.countDocuments({
      channelId,
      role: { $in: ["owner", "admin"] },
    }).exec();
  }

  upsertJoinRequest(payload: {
    channelId: string;
    userId: string;
    answers: ChannelJoinAnswer[];
    reason?: string;
  }) {
    return ChannelJoinRequestModel.findOneAndUpdate(
      { channelId: payload.channelId, userId: payload.userId },
      {
        $set: {
          answers: payload.answers,
          reason: payload.reason,
          status: "pending",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }

  findJoinRequest(channelId: string, userId: string) {
    return ChannelJoinRequestModel.findOne({ channelId, userId }).exec();
  }

  findJoinRequestsForUser(userId: string) {
    return ChannelJoinRequestModel.find({ userId }).exec();
  }

  findJoinRequestById(channelId: string, requestId: string) {
    return ChannelJoinRequestModel.findOne({ _id: requestId, channelId }).exec();
  }

  listPendingJoinRequests(channelId: string) {
    return ChannelJoinRequestModel
      .find({
        channelId,
        status: "pending",
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  async touchChannel(channelId: string): Promise<void> {
    await ChannelModel.findByIdAndUpdate(channelId, { $set: { updatedAt: new Date() } }).exec();
  }
}
