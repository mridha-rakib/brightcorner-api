import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import { createMessageSchema, listMessagesSchema } from "@/modules/messages/messages.schema.js";
import { MessagesService } from "@/modules/messages/messages.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

export class MessagesController {
  constructor(private readonly messagesService: MessagesService = new MessagesService()) {}

  readonly listMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(listMessagesSchema, req);
    const messages = await this.messagesService.listMessages(req.user!.id, payload.query);
    ApiResponse.success(res, messages, "Messages fetched successfully.");
  };

  readonly createMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(createMessageSchema, req);
    const message = await this.messagesService.createMessage(req.user!.id, payload.body);
    ApiResponse.created(res, message, "Message sent successfully.");
  };
}
