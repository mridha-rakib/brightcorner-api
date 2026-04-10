import type { HydratedDocument, Types } from "mongoose";

export type ChannelPrivacy = "public" | "private";
export type ChannelJoinStatus = "joined" | "not_joined" | "pending";
export type ChannelMembershipRole = "owner" | "admin" | "member";
export type ChannelJoinRequestStatus = "pending" | "approved" | "rejected";
export type ChannelJoinRequestReviewAction = "approve" | "reject";

export type ChannelQuestion = {
  questionId: string;
  text: string;
  options: string[];
};

export type ChannelJoinAnswer = {
  questionId: string;
  answer: string;
};

export type Channel = {
  name: string;
  description?: string;
  privacy: ChannelPrivacy;
  membersCanMessage: boolean;
  iconUrl?: string;
  questions: ChannelQuestion[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelMembership = {
  channelId: Types.ObjectId;
  userId: Types.ObjectId;
  role: ChannelMembershipRole;
  subscribed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelJoinRequest = {
  channelId: Types.ObjectId;
  userId: Types.ObjectId;
  answers: ChannelJoinAnswer[];
  reason?: string;
  status: ChannelJoinRequestStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelSummary = {
  id: string;
  type: "channel";
  name: string;
  description?: string;
  iconUrl?: string;
  isPublic: boolean;
  isEncrypted: true;
  membersCanMessage: boolean;
  joinStatus: ChannelJoinStatus;
  isSubscribed: boolean;
  unread: number;
  members: number;
  totalAdmins: number;
  online: number;
  lastMessage: string | null;
  lastMessageAt: Date | null;
};

export type ChannelDetail = ChannelSummary & {
  questions: ChannelQuestion[];
};

export type ChannelMember = {
  userId: string;
  role: ChannelMembershipRole;
  joinedAt: Date;
  isOnline: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    profile: {
      username?: string;
      bio?: string;
      avatarUrl?: string;
    };
  };
};

export type ChannelJoinRequestResponse = {
  id: string;
  channelId: string;
  answers: ChannelJoinAnswer[];
  reason?: string;
  status: ChannelJoinRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  requester: ChannelMember["user"];
};

export type ChannelDocument = HydratedDocument<Channel>;
export type ChannelMembershipDocument = HydratedDocument<ChannelMembership>;
export type ChannelJoinRequestDocument = HydratedDocument<ChannelJoinRequest>;
