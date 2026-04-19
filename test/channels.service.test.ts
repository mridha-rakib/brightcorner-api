import { describe, expect, it, vi } from "vitest";

import { ChannelsService } from "../src/modules/channels/channels.service.js";

const userId = "680000000000000000000001";
const ownedChannelId = "680000000000000000000010";
const managedChannelId = "680000000000000000000011";

describe("ChannelsService listChannels", () => {
  it("returns only owned channels for the owned scope", async () => {
    const channelsRepository = {
      countAdmins: vi.fn().mockResolvedValue(1),
      countMemberships: vi.fn().mockResolvedValue(2),
      findJoinRequestsForUser: vi.fn().mockResolvedValue([]),
      findMembershipsForUser: vi.fn().mockResolvedValue([
        {
          channelId: ownedChannelId,
          role: "owner",
          subscribed: true,
        },
        {
          channelId: managedChannelId,
          role: "admin",
          subscribed: true,
        },
      ]),
      listChannels: vi.fn().mockResolvedValue([
        {
          createdBy: userId,
          description: "Owned by the current user",
          iconUrl: undefined,
          id: ownedChannelId,
          membersCanMessage: false,
          name: "alpha",
          privacy: "private",
        },
        {
          createdBy: "680000000000000000000099",
          description: "Managed, but not owned",
          iconUrl: undefined,
          id: managedChannelId,
          membersCanMessage: true,
          name: "beta",
          privacy: "public",
        },
      ]),
    };
    const messageReadStateRepository = {
      listForUser: vi.fn().mockResolvedValue([]),
    };
    const messagesRepository = {
      countUnreadMessages: vi.fn().mockResolvedValue(0),
      findLatestMessage: vi.fn().mockResolvedValue(null),
    };

    const service = new ChannelsService(
      channelsRepository as never,
      {} as never,
      messagesRepository as never,
      messageReadStateRepository as never,
      {} as never,
    );

    const channels = await service.listChannels(userId, { scope: "owned" });

    expect(channels).toHaveLength(1);
    expect(channels[0]).toMatchObject({
      id: ownedChannelId,
      joinStatus: "joined",
      membershipRole: "owner",
      name: "alpha",
    });
    expect(channelsRepository.listChannels).toHaveBeenCalledWith(undefined);
    expect(messagesRepository.countUnreadMessages).toHaveBeenCalledTimes(1);
  });
});
