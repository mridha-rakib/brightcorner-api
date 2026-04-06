import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import {
  createMessageSchema,
  listMessagesSchema,
  markChatReadSchema,
  toggleMessageReactionSchema,
} from "@/modules/messages/messages.schema.js";
import { MessagesService } from "@/modules/messages/messages.service.js";
import { realtimeGateway } from "@/realtime/realtime.gateway.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

function resolveConversationUnlockToken(req: AuthenticatedRequest): string | undefined {
  const headerValue = req.header("x-conversation-unlock-token")?.trim();
  return headerValue ? headerValue : undefined;
}

export class MessagesController {
  constructor(private readonly messagesService: MessagesService = new MessagesService()) {}

  readonly listMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(listMessagesSchema, req);
    const messages = await this.messagesService.listMessages(req.user!.id, {
      ...payload.query,
      conversationUnlockToken: resolveConversationUnlockToken(req),
    });
    ApiResponse.success(res, messages, "Messages fetched successfully.");
  };

  readonly createMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(createMessageSchema, req);
    const message = await this.messagesService.createMessage(req.user!.id, {
      ...payload.body,
      conversationUnlockToken: resolveConversationUnlockToken(req),
    });
    await realtimeGateway.broadcastMessageCreated(message);
    ApiResponse.created(res, message, "Message sent successfully.");
  };

  readonly markChatRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(markChatReadSchema, req);
    await this.messagesService.markChatAsRead(req.user!.id, {
      ...payload.body,
      conversationUnlockToken: resolveConversationUnlockToken(req),
    });
    ApiResponse.success(res, null, "Chat marked as read successfully.");
  };

  readonly toggleReaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(toggleMessageReactionSchema, req);
    const message = await this.messagesService.toggleReaction(req.user!.id, {
      conversationUnlockToken: resolveConversationUnlockToken(req),
      emoji: payload.body.emoji,
      messageId: payload.params.messageId,
    });
    await realtimeGateway.broadcastMessageUpdated(message);
    ApiResponse.success(res, message, "Message reaction updated successfully.");
  };
}
