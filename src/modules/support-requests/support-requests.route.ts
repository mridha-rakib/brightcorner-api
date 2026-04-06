import { Router } from "express";

import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { SupportRequestsController } from "@/modules/support-requests/support-requests.controller.js";

class SupportRequestsRouter {
  public readonly router = Router();

  constructor(
    private readonly controller: SupportRequestsController = new SupportRequestsController(),
  ) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requiredAuth);
    this.router.post("/", this.controller.create);
  }
}

export default new SupportRequestsRouter().router;
