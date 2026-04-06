import { Router } from "express";

import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { NotificationsController } from "@/modules/notifications/notifications.controller.js";

class NotificationsRouter {
  public readonly router = Router();

  constructor(private readonly controller: NotificationsController = new NotificationsController()) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requiredAuth);
    this.router.get("/me", this.controller.listMine);
    this.router.patch("/me/read-all", this.controller.markAllAsRead);
  }
}

export default new NotificationsRouter().router;
