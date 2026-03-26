import { Router } from "express";

import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { ChannelsController } from "@/modules/channels/channels.controller.js";

class ChannelsRouter {
  public readonly router = Router();

  constructor(private readonly controller: ChannelsController = new ChannelsController()) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requiredAuth);

    this.router.get("/", this.controller.listChannels);
    this.router.post("/", this.controller.createChannel);
    this.router.get("/:channelId", this.controller.getChannelById);
    this.router.post("/:channelId/join", this.controller.joinPublicChannel);
    this.router.post("/:channelId/join-requests", this.controller.requestJoinPrivateChannel);
    this.router.get("/:channelId/members", this.controller.listMembers);
  }
}

export default new ChannelsRouter().router;
