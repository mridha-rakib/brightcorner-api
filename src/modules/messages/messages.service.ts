import type {
  CreateMessageInput,
  ListMessagesInput,
  MarkChatReadInput,
  ToggleMessageReactionInput,
} from "@/modules/messages/messages.interface.js";
import type {
  MessageChatType,
  MessageDocument,
  MessageListResponse,
  MessageReaction,
  MessageResponse,
} from "@/modules/messages/messages.type.js";
import type { PublicUser } from "@/modules/users/users.type.js";

import { ChannelsRepository } from "@/modules/channels/channels.repository.js";
import { ConversationsRepository } from "@/modules/conversations/conversations.repository.js";
import { ProtectedConversationAccessService } from "@/modules/conversations/protected-conversation-access.service.js";
import { MessageReadStateRepository } from "@/modules/messages/message-read-state.repository.js";
import { MessagesRepository } from "@/modules/messages/messages.repository.js";
import {
  resolveMessageTarget,
  toMessageReplyReference,
  toMessageResponse,
} from "@/modules/messages/messages.utils.js";
import { NotificationsService } from "@/modules/notifications/notifications.service.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { toPublicUser } from "@/modules/users/users.utils.js";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils.js";

export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository = new MessagesRepository(),
    private readonly messageReadStateRepository: MessageReadStateRepository = new MessageReadStateRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly channelsRepository: ChannelsRepository = new ChannelsRepository(),
    private readonly conversationsRepository: ConversationsRepository = new ConversationsRepository(),
    private readonly protectedConversationAccessService: ProtectedConversationAccessService = new ProtectedConversationAccessService(),
    private readonly notificationsService: NotificationsService = new NotificationsService(),
  ) {}

  async listMessages(userId: string, input: ListMessagesInput): Promise<MessageListResponse> {
    const chat = await this.resolveAccessibleChat(userId, input);
    const limit = input.limit ?? 40;
    const messagePage = await this.messagesRepository.listMessagesPage({
      beforeMessageId: input.beforeMessageId,
      chatType: chat.chatType,
      chatId: chat.chatId,
      limit,
      pinnedOnly: input.pinnedOnly,
    });
    const nextCursor = messagePage.hasMore
      ? messagePage.items[messagePage.items.length - 1]?.id ?? null
      : null;

    return {
      items: await this.buildMessageResponses([...messagePage.items].reverse()),
      nextCursor,
    };
  }

  async createMessage(userId: string, input: CreateMessageInput): Promise<MessageResponse> {
    const chat = await this.resolveAccessibleChat(userId, input, "write");
    if (input.replyToMessageId) {
      const replyTarget = await this.messagesRepository.findById(input.replyToMessageId);
      if (
        !replyTarget
        || replyTarget.chatType !== chat.chatType
        || String(replyTarget.chatId) !== chat.chatId
      ) {
        throw new BadRequestException("Reply target must belong to the active chat.");
      }
    }

    const message = await this.messagesRepository.createMessage({
      attachments: input.attachments ?? [],
      chatType: chat.chatType,
      chatId: chat.chatId,
      pinned: input.pinned ?? false,
      replyToMessageId: input.replyToMessageId,
      senderId: userId,
      text: input.text?.trim() ?? "",
    });

    if (chat.chatType === "channel")
      await this.channelsRepository.touchChannel(chat.chatId);
    else
      await this.conversationsRepository.touchConversation(chat.chatId);

    await this.notificationsService.notifyMessageCreated({
      attachmentsCount: input.attachments?.length ?? 0,
      chatId: chat.chatId,
      chatType: chat.chatType,
      senderId: userId,
      text: input.text?.trim() ?? "",
    });

    const [createdMessage] = await this.buildMessageResponses([message]);
    if (!createdMessage)
      throw new NotFoundException("Message sender not found.");

    return createdMessage;
  }

  async markChatAsRead(userId: string, input: MarkChatReadInput): Promise<void> {
    const chat = await this.resolveAccessibleChat(userId, input);

    await this.messageReadStateRepository.upsertReadState({
      chatId: chat.chatId,
      chatType: chat.chatType,
      userId,
    });
  }

  async toggleReaction(
    userId: string,
    input: ToggleMessageReactionInput,
  ): Promise<MessageResponse> {
    const message = await this.messagesRepository.findById(input.messageId);
    if (!message)
      throw new NotFoundException("Message not found.");

    await this.ensureChatAccess(
      userId,
      message.chatType,
      String(message.chatId),
      input.conversationUnlockToken,
    );

    const existingReactionIndex = message.reactions.findIndex((reaction: MessageReaction) =>
      reaction.emoji === input.emoji && String(reaction.userId) === userId,
    );

    if (existingReactionIndex >= 0) {
      message.reactions.splice(existingReactionIndex, 1);
    }
    else {
      message.reactions.push({
        createdAt: new Date(),
        emoji: input.emoji.trim(),
        userId,
      } as (typeof message.reactions)[number]);
    }

    await this.messagesRepository.save(message);

    const [updatedMessage] = await this.buildMessageResponses([message]);
    if (!updatedMessage)
      throw new NotFoundException("Message sender not found.");

    return updatedMessage;
  }

  private async resolveAccessibleChat(
    userId: string,
    input: Pick<ListMessagesInput, "channelId" | "conversationId" | "conversationUnlockToken">,
    accessMode: "read" | "write" = "read",
  ): Promise<{ chatType: MessageChatType; chatId: string }> {
    const target = resolveMessageTarget(input);
    await this.ensureChatAccess(
      userId,
      target.chatType,
      target.chatId,
      input.conversationUnlockToken,
      accessMode,
    );

    return target;
  }

  private async ensureChatAccess(
    userId: string,
    chatType: MessageChatType,
    chatId: string,
    conversationUnlockToken?: string,
    accessMode: "read" | "write" = "read",
  ): Promise<void> {
    if (chatType === "channel") {
      const channel = await this.channelsRepository.findById(chatId);
      if (!channel)
        throw new NotFoundException("Channel not found.");

      const membership = await this.channelsRepository.findMembership(chatId, userId);
      if (!membership)
        throw new ForbiddenException("You must join this channel before accessing its messages.");

      if (
        accessMode === "write"
        && !channel.membersCanMessage
        && !["owner", "admin"].includes(membership.role)
      ) {
        throw new ForbiddenException("Only channel owners and admins can send messages in this channel.");
      }

      return;
    }

    const conversation = await this.conversationsRepository.findById(chatId);
    if (!conversation)
      throw new NotFoundException("Conversation not found.");

    const isParticipant = conversation.participantIds
      .map((participantId: (typeof conversation.participantIds)[number]) => String(participantId))
      .includes(userId);

    if (!isParticipant)
      throw new ForbiddenException("You do not have access to this conversation.");

    if (conversation.pinProtected) {
      const isUnlocked = this.protectedConversationAccessService.validateAccessToken({
        conversationId: conversation.id,
        token: conversationUnlockToken,
        userId,
      });

      if (!isUnlocked)
        throw new ForbiddenException("PIN verification required for this conversation.");
    }
  }

  private async buildMessageResponses(messages: MessageDocument[]): Promise<MessageResponse[]> {
    const replyMessageIds = [
      ...new Set(
        messages
          .map(message => message.replyToMessageId ? String(message.replyToMessageId) : null)
          .filter((messageId): messageId is string => Boolean(messageId)),
      ),
    ];
    const replyMessages = await this.messagesRepository.findManyByIds(replyMessageIds);
    const replyMessageMap = new Map<string, MessageDocument>(
      replyMessages.map(replyMessage => [replyMessage.id, replyMessage]),
    );
    const senderIds = [
      ...new Set([
        ...messages.map(message => String(message.senderId)),
        ...replyMessages.map(replyMessage => String(replyMessage.senderId)),
      ]),
    ];
    const senders = await this.usersRepository.findManyByIds(senderIds);
    const senderMap = new Map<string, PublicUser>(
      senders.map(sender => [sender.id, toPublicUser(sender)]),
    );

    return messages
      .map((message) => {
        const sender = senderMap.get(String(message.senderId));
        if (!sender)
          return null;

        const replyMessage = message.replyToMessageId
          ? replyMessageMap.get(String(message.replyToMessageId))
          : null;
        const replySender = replyMessage
          ? senderMap.get(String(replyMessage.senderId))
          : null;

        return toMessageResponse({
          message,
          replyTo: replyMessage && replySender
            ? toMessageReplyReference(replyMessage, replySender)
            : null,
          sender,
        });
      })
      .filter((message): message is MessageResponse => Boolean(message));
  }
}
