import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import {
  conversationParamsSchema,
  createDirectConversationSchema,
  listConversationsSchema,
  unlockProtectedConversationSchema,
} from "@/modules/conversations/conversations.schema.js";
import { ConversationsService } from "@/modules/conversations/conversations.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

function resolveConversationUnlockToken(req: AuthenticatedRequest): string | undefined {
  const headerValue = req.header("x-conversation-unlock-token")?.trim();
  return headerValue ? headerValue : undefined;
}

export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService = new ConversationsService(),
  ) {}

  readonly listConversations = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(listConversationsSchema, req);
    const conversations = await this.conversationsService.listMyConversations(
      req.user!.id,
      payload.query,
    );
    ApiResponse.success(res, conversations, "Conversations fetched successfully.");
  };

  readonly createDirectConversation = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(createDirectConversationSchema, req);
    const conversation = await this.conversationsService.createOrGetDirectConversation(
      req.user!.id,
      payload.body,
    );
    ApiResponse.success(res, conversation, "Conversation ready successfully.");
  };

  readonly getConversationById = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(conversationParamsSchema, req);
    const conversation = await this.conversationsService.getConversationById(
      req.user!.id,
      payload.params.conversationId,
      resolveConversationUnlockToken(req),
    );
    ApiResponse.success(res, conversation, "Conversation fetched successfully.");
  };

  readonly unlockProtectedConversation = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(unlockProtectedConversationSchema, req);
    const conversationAccess = await this.conversationsService.unlockProtectedConversation(
      req.user!.id,
      payload.params.conversationId,
      payload.body,
    );
    ApiResponse.success(res, conversationAccess, "Conversation unlocked successfully.");
  };

  readonly lockProtectedConversation = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(conversationParamsSchema, req);
    const conversation = await this.conversationsService.lockProtectedConversation(
      req.user!.id,
      payload.params.conversationId,
      resolveConversationUnlockToken(req),
    );
    ApiResponse.success(res, conversation, "Conversation locked successfully.");
  };
}
