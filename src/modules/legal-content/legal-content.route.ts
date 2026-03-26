import { Router } from "express";

import { authorizeRoles } from "@/common/auth/role-guard.middleware.js";
import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { LegalContentController } from "@/modules/legal-content/legal-content.controller.js";

class LegalContentRouter {
  public readonly router = Router();

  constructor(
    private readonly controller: LegalContentController = new LegalContentController(),
  ) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.get("/:type", this.controller.getByType);
    this.router.put("/:type", requiredAuth, authorizeRoles("admin"), this.controller.upsert);
  }
}

export default new LegalContentRouter().router;
