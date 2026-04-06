import { Router } from "express";

import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { AuthController } from "@/modules/auth/auth.controller.js";

class AuthRouter {
  public readonly router = Router();

  constructor(private readonly controller: AuthController = new AuthController()) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.post("/sign-up", this.controller.signUp);
    this.router.post("/sign-in", this.controller.signIn);
    this.router.post("/two-factor/resend", this.controller.resendSignInTwoFactor);
    this.router.post("/two-factor/verify", this.controller.verifySignInTwoFactor);
    this.router.post("/refresh", this.controller.refresh);
    this.router.post("/sign-out", this.controller.signOut);
    this.router.post("/forgot-password", this.controller.forgotPassword);
    this.router.post("/reset-password", this.controller.resetPassword);
    this.router.get("/me", requiredAuth, this.controller.me);
  }
}

export default new AuthRouter().router;
