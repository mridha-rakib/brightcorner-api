import { Router } from "express";

import { authorizeRoles } from "@/common/auth/role-guard.middleware.js";
import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { AdminController } from "@/modules/admin/admin.controller.js";

class AdminRouter {
  public readonly router = Router();

  constructor(private readonly controller: AdminController = new AdminController()) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requiredAuth, authorizeRoles("admin"));

    this.router.get("/dashboard", this.controller.getDashboardSummary);
    this.router.get("/users", this.controller.listUsers);
    this.router.get("/users/:userId", this.controller.getUserById);
    this.router.patch("/users/:userId/status", this.controller.updateUserStatus);
  }
}

export default new AdminRouter().router;
