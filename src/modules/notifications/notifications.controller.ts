import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import { NotificationsService } from "@/modules/notifications/notifications.service.js";
import { ApiResponse } from "@/utils/response.utils.js";

export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService = new NotificationsService(),
  ) {}

  readonly listMine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const notifications = await this.notificationsService.listNotifications(req.user!.id);
    ApiResponse.success(res, notifications, "Notifications fetched successfully.");
  };

  readonly markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await this.notificationsService.markAllAsRead(req.user!.id);
    ApiResponse.noContent(res);
  };
}
