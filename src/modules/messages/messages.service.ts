import type { CreateMessageInput, ListMessagesInput } from "@/modules/messages/messages.interface.js";
import type {
  MessageChatType,
  MessageDocument,
  MessageResponse,
} from "@/modules/messages/messages.type.js";
import type { PublicUser } from "@/modules/users/users.type.js";

import { ChannelsRepository } from "@/modules/channels/channels.repository.js";
import { ConversationsRepository } from "@/modules/conversations/conversations.repository.js";
import { MessagesRepository } from "@/modules/messages/messages.repository.js";
import { resolveMessageTarget, toMessageResponse } from "@/modules/messages/messages.utils.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { toPublicUser } from "@/modules/users/users.utils.js";
import { ForbiddenException, NotFoundException } from "@/utils/app-error.utils.js";

export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository = new MessagesRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly channelsRepository: ChannelsRepository = new ChannelsRepository(),
    private readonly conversationsRepository: ConversationsRepository = new ConversationsRepository(),
  ) {}

  async listMessages(userId: string, input: ListMessagesInput): Promise<MessageResponse[]> {
    const chat = await this.resolveAccessibleChat(userId, input);
    const messages = await this.messagesRepository.listMessages({
      chatType: chat.chatType,
      chatId: chat.chatId,
      pinnedOnly: input.pinnedOnly,
    });

    return this.buildMessageResponses(messages);
  }

  async createMessage(userId: string, input: CreateMessageInput): Promise<MessageResponse> {
    const chat = await this.resolveAccessibleChat(userId, input);
    const sender = await this.usersRepository.findActiveById(userId);
    if (!sender)
      throw new NotFoundException("User not found.");

    const message = await this.messagesRepository.createMessage({
      chatType: chat.chatType,
      chatId: chat.chatId,
      senderId: userId,
      text: input.text.trim(),
      pinned: input.pinned ?? false,
    });

    if (chat.chatType === "channel")
      await this.channelsRepository.touchChannel(chat.chatId);
    else
      await this.conversationsRepository.touchConversation(chat.chatId);

    return toMessageResponse({
      message,
      sender: toPublicUser(sender),
    });
  }

  private async resolveAccessibleChat(
    userId: string,
    input: Pick<ListMessagesInput, "channelId" | "conversationId">,
  ): Promise<{ chatType: MessageChatType; chatId: string }> {
    const target = resolveMessageTarget(input);

    if (target.chatType === "channel") {
      const channel = await this.channelsRepository.findById(target.chatId);
      if (!channel)
        throw new NotFoundException("Channel not found.");

      const membership = await this.channelsRepository.findMembership(target.chatId, userId);
      if (!membership)
        throw new ForbiddenException("You must join this channel before accessing its messages.");

      return target;
    }

    const conversation = await this.conversationsRepository.findById(target.chatId);
    if (!conversation)
      throw new NotFoundException("Conversation not found.");

    const isParticipant = conversation.participantIds
      .map((participantId: (typeof conversation.participantIds)[number]) => String(participantId))
      .includes(userId);

    if (!isParticipant)
      throw new ForbiddenException("You do not have access to this conversation.");

    return target;
  }

  private async buildMessageResponses(messages: MessageDocument[]): Promise<MessageResponse[]> {
    const senderIds = [...new Set(messages.map(message => String(message.senderId)))];
    const senders = await this.usersRepository.findManyByIds(senderIds);
    const senderMap = new Map<string, PublicUser>(
      senders.map(sender => [sender.id, toPublicUser(sender)]),
    );

    return messages
      .map((message) => {
        const sender = senderMap.get(String(message.senderId));
        if (!sender)
          return null;

        return toMessageResponse({
          message,
          sender,
        });
      })
      .filter((message): message is MessageResponse => Boolean(message));
  }
}
