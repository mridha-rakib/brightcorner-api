import { Router } from "express";

import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { UsersController } from "@/modules/users/users.controller.js";

class UsersRouter {
  public readonly router = Router();

  constructor(private readonly controller: UsersController = new UsersController()) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requiredAuth);

    this.router.get("/directory", this.controller.listDirectory);
    this.router.get("/me", this.controller.getMe);
    this.router.patch("/me/onboarding", this.controller.completeOnboarding);
    this.router.patch("/me/profile", this.controller.updateProfile);
    this.router.patch("/me/privacy-settings", this.controller.updatePrivacySettings);
    this.router.patch("/me/notification-settings", this.controller.updateNotificationSettings);
    this.router.patch("/me/change-email", this.controller.changeEmail);
    this.router.patch("/me/change-password", this.controller.changePassword);
    this.router.get("/me/two-factor", this.controller.getTwoFactorSettings);
    this.router.post("/me/two-factor/send-code", this.controller.sendTwoFactorCode);
    this.router.post("/me/two-factor/verify", this.controller.verifyTwoFactor);
    this.router.delete("/me", this.controller.deleteMyAccount);
  }
}

export default new UsersRouter().router;
