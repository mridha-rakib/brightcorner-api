import type {
  CreateDirectConversationInput,
  ListConversationsInput,
  UnlockProtectedConversationInput,
} from "@/modules/conversations/conversations.interface.js";
import type {
  ConversationDetail,
  ConversationDocument,
  ConversationSummary,
  ConversationUnlockResponse,
} from "@/modules/conversations/conversations.type.js";
import type { PublicUser } from "@/modules/users/users.type.js";

import { PasswordService } from "@/common/auth/password.service.js";
import { ProtectedConversationAccessService } from "@/modules/conversations/protected-conversation-access.service.js";
import { ConversationsRepository } from "@/modules/conversations/conversations.repository.js";
import {
  buildConversationParticipantKey,
  getOtherParticipantId,
  toConversationSummary,
} from "@/modules/conversations/conversations.utils.js";
import { MessageReadStateRepository } from "@/modules/messages/message-read-state.repository.js";
import { MessagesRepository } from "@/modules/messages/messages.repository.js";
import { resolveMessagePreview } from "@/modules/messages/messages.utils.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { toPublicUser } from "@/modules/users/users.utils.js";
import { BadRequestException, ForbiddenException, NotFoundException } from "@/utils/app-error.utils.js";

export class ConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository = new ConversationsRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly messagesRepository: MessagesRepository = new MessagesRepository(),
    private readonly messageReadStateRepository: MessageReadStateRepository = new MessageReadStateRepository(),
    private readonly protectedConversationAccessService: ProtectedConversationAccessService = new ProtectedConversationAccessService(),
    private readonly passwordService: PasswordService = new PasswordService(),
  ) {}

  async listMyConversations(
    userId: string,
    input: ListConversationsInput,
  ): Promise<ConversationSummary[]> {
    const [conversations, readStates] = await Promise.all([
      this.conversationsRepository.listForUser(userId),
      this.messageReadStateRepository.listForUser(userId),
    ]);
    const participantMap = await this.buildParticipantMap(conversations, userId);
    const readStateMap = new Map(
      readStates
        .filter(readState => readState.chatType === "conversation")
        .map(readState => [String(readState.chatId), readState]),
    );

    const visibleConversations = conversations.filter((conversation) => {
      if (!input.search)
        return true;

      const participant = participantMap.get(getOtherParticipantId(conversation, userId));
      if (!participant)
        return false;

      const searchValue = input.search.trim().toLowerCase();
      return [
        participant.fullName,
        participant.email,
        participant.profile.username,
      ]
        .filter(Boolean)
        .some(value => value?.toLowerCase().includes(searchValue));
    });

    return Promise.all(
      visibleConversations.map(async (conversation) => {
        const participant = participantMap.get(getOtherParticipantId(conversation, userId));
        if (!participant)
          throw new NotFoundException("Conversation participant not found.");

        return this.buildConversationSummary(
          conversation,
          participant,
          userId,
          readStateMap.get(conversation.id) ?? null,
          false,
        );
      }),
    );
  }

  async createOrGetDirectConversation(
    currentUserId: string,
    input: CreateDirectConversationInput,
  ): Promise<ConversationDetail> {
    if (currentUserId === input.participantUserId) {
      throw new BadRequestException("You cannot start a direct conversation with yourself.");
    }

    const participant = await this.usersRepository.findActiveById(input.participantUserId);
    if (!participant)
      throw new NotFoundException("Conversation participant not found.");

    const participantKey = buildConversationParticipantKey([currentUserId, input.participantUserId]);
    const existingConversation = await this.conversationsRepository.findByParticipantKey(participantKey);

    if (existingConversation) {
      if (input.pin) {
        await this.conversationsRepository.updatePinProtection(existingConversation.id, {
          pinProtected: true,
          accessPinHash: await this.passwordService.hash(input.pin),
        });
      }

      return this.getConversationById(currentUserId, existingConversation.id);
    }

    const createdConversation = await this.conversationsRepository.createConversation({
      participantIds: [currentUserId, input.participantUserId],
      participantKey,
      pinProtected: Boolean(input.pin),
      accessPinHash: input.pin ? await this.passwordService.hash(input.pin) : undefined,
      createdBy: currentUserId,
    });

    return this.getConversationById(currentUserId, createdConversation.id);
  }

  async getConversationById(
    userId: string,
    conversationId: string,
    unlockToken?: string,
  ): Promise<ConversationDetail> {
    const conversation = await this.ensureConversationParticipant(userId, conversationId);
    const otherParticipantId = getOtherParticipantId(conversation, userId);
    const [participant, readState] = await Promise.all([
      this.usersRepository.findActiveById(otherParticipantId),
      this.messageReadStateRepository.findByUserAndChat({
        chatId: conversationId,
        chatType: "conversation",
        userId,
      }),
    ]);
    if (!participant)
      throw new NotFoundException("Conversation participant not found.");

    const isUnlocked = this.isConversationUnlockedForUser(conversation, userId, unlockToken);

    return this.buildConversationSummary(
      conversation,
      toPublicUser(participant),
      userId,
      readState,
      isUnlocked,
    );
  }

  async unlockProtectedConversation(
    userId: string,
    conversationId: string,
    input: UnlockProtectedConversationInput,
  ): Promise<ConversationUnlockResponse> {
    const conversation = await this.ensureConversationParticipant(userId, conversationId, true);
    if (!conversation.pinProtected || !conversation.accessPinHash)
      throw new BadRequestException("This conversation does not require a PIN.");

    const isValidPin = await this.passwordService.compare(input.pin, conversation.accessPinHash);
    if (!isValidPin)
      throw new ForbiddenException("Incorrect PIN for this conversation.");

    const unlockToken = this.protectedConversationAccessService.issueAccessToken({
      conversationId,
      userId,
    });

    return {
      conversation: await this.getConversationById(userId, conversationId, unlockToken),
      unlockToken,
    };
  }

  async lockProtectedConversation(
    userId: string,
    conversationId: string,
    unlockToken?: string,
  ): Promise<ConversationDetail> {
    await this.ensureConversationParticipant(userId, conversationId);
    this.protectedConversationAccessService.revokeAccessToken(unlockToken);

    return this.getConversationById(userId, conversationId);
  }

  isConversationUnlockedForUser(
    conversation: ConversationDocument,
    userId: string,
    unlockToken?: string,
  ): boolean {
    if (!conversation.pinProtected)
      return true;

    return this.protectedConversationAccessService.validateAccessToken({
      conversationId: conversation.id,
      token: unlockToken,
      userId,
    });
  }

  async ensureConversationParticipant(
    userId: string,
    conversationId: string,
    includeAccessPin = false,
  ): Promise<ConversationDocument> {
    const conversation = includeAccessPin
      ? await this.conversationsRepository.findByIdWithAccessPin(conversationId)
      : await this.conversationsRepository.findById(conversationId);
    if (!conversation)
      throw new NotFoundException("Conversation not found.");

    const isParticipant = conversation.participantIds
      .map((participantId: ConversationDocument["participantIds"][number]) => String(participantId))
      .includes(userId);

    if (!isParticipant)
      throw new ForbiddenException("You do not have access to this conversation.");

    return conversation;
  }

  private async buildParticipantMap(
    conversations: ConversationDocument[],
    currentUserId: string,
  ): Promise<Map<string, PublicUser>> {
    const participantIds = [...new Set(
      conversations.map(conversation => getOtherParticipantId(conversation, currentUserId)),
    )];
    const participants = await this.usersRepository.findManyByIds(participantIds);

    return new Map(participants.map(participant => [participant.id, toPublicUser(participant)]));
  }

  private async buildConversationSummary(
    conversation: ConversationDocument,
    participant: PublicUser,
    userId: string,
    readState: Awaited<ReturnType<MessageReadStateRepository["listForUser"]>>[number] | null,
    isUnlocked: boolean,
  ): Promise<ConversationSummary> {
    const [lastMessage, unread] = await Promise.all([
      this.messagesRepository.findLatestMessage({
        chatType: "conversation",
        chatId: conversation.id,
      }),
      this.messagesRepository.countUnreadMessages({
        chatId: conversation.id,
        chatType: "conversation",
        lastReadAt: readState?.lastReadAt ?? null,
        userId,
      }),
    ]);
    const isLocked = conversation.pinProtected && !isUnlocked;

    return toConversationSummary({
      conversation,
      isLocked,
      participant,
      unread,
      lastMessage: isLocked ? "PIN protected conversation" : resolveMessagePreview(lastMessage),
      lastMessageAt: lastMessage?.createdAt ?? null,
    });
  }
}
