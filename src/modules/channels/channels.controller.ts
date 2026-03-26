import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import {
  channelParamsSchema,
  createChannelSchema,
  createJoinRequestSchema,
  listChannelsSchema,
} from "@/modules/channels/channels.schema.js";
import { ChannelsService } from "@/modules/channels/channels.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService = new ChannelsService()) {}

  readonly listChannels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(listChannelsSchema, req);
    const channels = await this.channelsService.listChannels(req.user!.id, payload.query);
    ApiResponse.success(res, channels, "Channels fetched successfully.");
  };

  readonly createChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(createChannelSchema, req);
    const channel = await this.channelsService.createChannel(req.user!.id, payload.body);
    ApiResponse.created(res, channel, "Channel created successfully.");
  };

  readonly getChannelById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(channelParamsSchema, req);
    const channel = await this.channelsService.getChannelById(req.user!.id, payload.params.channelId);
    ApiResponse.success(res, channel, "Channel fetched successfully.");
  };

  readonly joinPublicChannel = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(channelParamsSchema, req);
    const channel = await this.channelsService.joinPublicChannel(req.user!.id, payload.params.channelId);
    ApiResponse.success(res, channel, "Channel joined successfully.");
  };

  readonly requestJoinPrivateChannel = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(createJoinRequestSchema, req);
    const channel = await this.channelsService.requestJoinPrivateChannel(
      req.user!.id,
      payload.params.channelId,
      payload.body,
    );
    ApiResponse.success(res, channel, "Join request submitted successfully.");
  };

  readonly listMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(channelParamsSchema, req);
    const members = await this.channelsService.listMembers(req.user!.id, payload.params.channelId);
    ApiResponse.success(res, members, "Channel members fetched successfully.");
  };
}
