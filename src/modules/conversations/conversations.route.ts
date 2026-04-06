import { Router } from "express";

import { requiredAuth } from "@/middlewares/auth.middleware.js";
import { ConversationsController } from "@/modules/conversations/conversations.controller.js";

class ConversationsRouter {
  public readonly router = Router();

  constructor(
    private readonly controller: ConversationsController = new ConversationsController(),
  ) {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requiredAuth);

    this.router.get("/", this.controller.listConversations);
    this.router.post("/direct", this.controller.createDirectConversation);
    this.router.post("/:conversationId/unlock", this.controller.unlockProtectedConversation);
    this.router.post("/:conversationId/lock", this.controller.lockProtectedConversation);
    this.router.get("/:conversationId", this.controller.getConversationById);
  }
}

export default new ConversationsRouter().router;
