import { Router } from "express";

import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { MessagesController } from "@/modules/messages/messages.controller.js";

class MessagesRouter {
  public readonly router = Router();

  constructor(private readonly controller: MessagesController = new MessagesController()) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requiredAuth);

    this.router.get("/", this.controller.listMessages);
    this.router.post("/", this.controller.createMessage);
    this.router.post("/read", this.controller.markChatRead);
    this.router.post("/:messageId/reactions", this.controller.toggleReaction);
  }
}

export default new MessagesRouter().router;
