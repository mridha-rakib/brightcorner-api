import type { Request, Response } from "express";

import { Router } from "express";

import adminRouter from "@/modules/admin/admin.route.js";
import authRouter from "@/modules/auth/auth.route.js";
import channelsRouter from "@/modules/channels/channels.route.js";
import conversationsRouter from "@/modules/conversations/conversations.route.js";
import legalContentRouter from "@/modules/legal-content/legal-content.route.js";
import messagesRouter from "@/modules/messages/messages.route.js";
import notificationsRouter from "@/modules/notifications/notifications.route.js";
import supportRequestsRouter from "@/modules/support-requests/support-requests.route.js";
import usersRouter from "@/modules/users/users.route.js";
import { ApiResponse } from "@/utils/response.utils.js";

class RootRouter {
  public readonly router = Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.get("/", this.getBaseRoute);
    this.router.get("/health", this.getHealthRoute);
    this.router.use("/auth", authRouter);
    this.router.use("/admin", adminRouter);
    this.router.use("/channels", channelsRouter);
    this.router.use("/conversations", conversationsRouter);
    this.router.use("/users", usersRouter);
    this.router.use("/legal-content", legalContentRouter);
    this.router.use("/messages", messagesRouter);
    this.router.use("/notifications", notificationsRouter);
    this.router.use("/support-requests", supportRequestsRouter);
  }

  private readonly getBaseRoute = (_req: Request, res: Response): void => {
    ApiResponse.success(res, { service: "Bright Corner API" }, "API is running");
  };

  private readonly getHealthRoute = (_req: Request, res: Response): void => {
    ApiResponse.success(res, { status: "ok" }, "Service is healthy");
  };
}

export default new RootRouter().router;
