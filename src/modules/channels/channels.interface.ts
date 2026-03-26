import type { ChannelJoinAnswer, ChannelPrivacy } from "@/modules/channels/channels.type.js";

export type CreateChannelInput = {
  name: string;
  description?: string;
  privacy: ChannelPrivacy;
  iconUrl?: string;
  questions?: Array<{
    text: string;
    options: string[];
  }>;
};

export type ListChannelsInput = {
  scope?: "all" | "joined" | "discoverable";
  search?: string;
};

export type CreateJoinRequestInput = {
  answers?: ChannelJoinAnswer[];
  reason?: string;
};
