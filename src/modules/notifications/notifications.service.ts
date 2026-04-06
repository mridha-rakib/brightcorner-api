import { ChannelsRepository } from "@/modules/channels/channels.repository.js";
import { ConversationsRepository } from "@/modules/conversations/conversations.repository.js";
import { NotificationsRepository } from "@/modules/notifications/notifications.repository.js";
import type { NotificationResponse } from "@/modules/notifications/notifications.type.js";
import { UsersRepository } from "@/modules/users/users.repository.js";

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength)
    return trimmed;

  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function extractMentionedUsernames(text: string): string[] {
  const matches = text.matchAll(/@([\w-]+)/g);
  return [...new Set(
    Array.from(matches, match => match[1]?.trim().toLowerCase()).filter(Boolean) as string[],
  )];
}

export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository = new NotificationsRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly conversationsRepository: ConversationsRepository = new ConversationsRepository(),
    private readonly channelsRepository: ChannelsRepository = new ChannelsRepository(),
  ) {}

  async listNotifications(userId: string): Promise<NotificationResponse[]> {
    const notifications = await this.notificationsRepository.listForUser(userId);

    return notifications.map(notification => ({
      content: notification.content,
      createdAt: notification.createdAt,
      id: notification.id,
      isRead: Boolean(notification.readAt),
      type: notification.type,
      user: {
        avatar: notification.actorAvatarUrl,
        name: notification.actorName,
      },
    }));
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.markAllAsRead(userId);
  }

  async notifyMessageCreated(input: {
    attachmentsCount: number;
    chatId: string;
    chatType: "channel" | "conversation";
    senderId: string;
    text: string;
  }): Promise<void> {
    const sender = await this.usersRepository.findActiveById(input.senderId);
    if (!sender)
      return;

    if (input.chatType === "conversation") {
      const conversation = await this.conversationsRepository.findById(input.chatId);
      if (!conversation)
        return;

      const recipientId = conversation.participantIds
        .map((participantId: (typeof conversation.participantIds)[number]) => String(participantId))
        .find((participantId: string) => participantId !== input.senderId);

      if (!recipientId)
        return;

      await this.notificationsRepository.createMany([{
        actorAvatarUrl: sender.profile.avatarUrl,
        actorName: sender.fullName,
        chatId: input.chatId,
        chatType: "conversation",
        content: this.buildDirectMessageContent(input.text, input.attachmentsCount),
        type: "message",
        userId: recipientId,
      }]);

      return;
    }

    const mentionedUsernames = extractMentionedUsernames(input.text);
    const [channel, memberships] = await Promise.all([
      this.channelsRepository.findById(input.chatId),
      this.channelsRepository.listMemberships(input.chatId),
    ]);

    if (!channel)
      return;

    const members = await this.usersRepository.findManyByIds(
      memberships.map(membership => String(membership.userId)),
    );
    const membershipByUserId = new Map(
      memberships.map(membership => [String(membership.userId), membership]),
    );

    const mentionRecipients = members.filter(member =>
      member.id !== input.senderId
      && Boolean(member.profile.username)
      && mentionedUsernames.includes(member.profile.username!.toLowerCase())
      && member.notificationSettings.channelMentions,
    );
    const mentionedRecipientIds = new Set(mentionRecipients.map(recipient => recipient.id));
    const subscribedRecipients = members.filter((member) => {
      const membership = membershipByUserId.get(member.id);
      if (!membership)
        return false;

      return member.id !== input.senderId
        && Boolean(membership.subscribed)
        && !mentionedRecipientIds.has(member.id);
    });

    const notifications = [
      ...mentionRecipients.map(recipient => ({
        actorAvatarUrl: sender.profile.avatarUrl,
        actorName: sender.fullName,
        chatId: input.chatId,
        chatType: "channel" as const,
        content: `mentioned you in #${channel.name}: "${truncateText(input.text, 140)}"`,
        type: "mention" as const,
        userId: recipient.id,
      })),
      ...subscribedRecipients.map(recipient => ({
        actorAvatarUrl: sender.profile.avatarUrl,
        actorName: sender.fullName,
        chatId: input.chatId,
        chatType: "channel" as const,
        content: this.buildChannelMessageContent(channel.name, input.text, input.attachmentsCount),
        type: "message" as const,
        userId: recipient.id,
      })),
    ];

    if (notifications.length === 0)
      return;

    await this.notificationsRepository.createMany(notifications);
  }

  async notifyPrivateChannelJoinRequest(input: {
    channelId: string;
    requesterId: string;
  }): Promise<void> {
    const [channel, requester, memberships] = await Promise.all([
      this.channelsRepository.findById(input.channelId),
      this.usersRepository.findActiveById(input.requesterId),
      this.channelsRepository.listMemberships(input.channelId),
    ]);

    if (!channel || !requester)
      return;

    const adminMemberships = memberships.filter(membership =>
      String(membership.userId) !== input.requesterId
      && (membership.role === "owner" || membership.role === "admin"),
    );

    if (adminMemberships.length === 0)
      return;

    const admins = await this.usersRepository.findManyByIds(
      adminMemberships.map(membership => String(membership.userId)),
    );

    await this.notificationsRepository.createMany(
      admins
        .filter(admin => admin.notificationSettings.joinRequestAlerts)
        .map(admin => ({
          actorAvatarUrl: requester.profile.avatarUrl,
          actorName: requester.fullName,
          chatId: input.channelId,
          chatType: "channel",
          content: `requested to join #${channel.name}.`,
          type: "message",
          userId: admin.id,
        })),
    );
  }

  async notifyPrivateChannelJoinRequestApproved(input: {
    channelId: string;
    requesterId: string;
    reviewerId: string;
  }): Promise<void> {
    const [channel, requester, reviewer] = await Promise.all([
      this.channelsRepository.findById(input.channelId),
      this.usersRepository.findActiveById(input.requesterId),
      this.usersRepository.findActiveById(input.reviewerId),
    ]);

    if (!channel || !requester || !reviewer)
      return;

    await this.notificationsRepository.createMany([{
      actorAvatarUrl: reviewer.profile.avatarUrl,
      actorName: reviewer.fullName,
      chatId: input.channelId,
      chatType: "channel",
      content: `approved your request to join #${channel.name}.`,
      type: "message",
      userId: requester.id,
    }]);
  }

  async notifyPrivateChannelJoinRequestRejected(input: {
    channelId: string;
    requesterId: string;
    reviewerId: string;
  }): Promise<void> {
    const [channel, requester, reviewer] = await Promise.all([
      this.channelsRepository.findById(input.channelId),
      this.usersRepository.findActiveById(input.requesterId),
      this.usersRepository.findActiveById(input.reviewerId),
    ]);

    if (!channel || !requester || !reviewer)
      return;

    await this.notificationsRepository.createMany([{
      actorAvatarUrl: reviewer.profile.avatarUrl,
      actorName: reviewer.fullName,
      chatId: input.channelId,
      chatType: "channel",
      content: `declined your request to join #${channel.name}.`,
      type: "message",
      userId: requester.id,
    }]);
  }

  private buildDirectMessageContent(text: string, attachmentsCount: number): string {
    const trimmedText = text.trim();
    if (trimmedText.length > 0)
      return `sent you a direct message: "${truncateText(trimmedText, 140)}"`;

    if (attachmentsCount > 0)
      return "sent you a direct attachment.";

    return "sent you a direct message.";
  }

  private buildChannelMessageContent(
    channelName: string,
    text: string,
    attachmentsCount: number,
  ): string {
    const trimmedText = text.trim();
    if (trimmedText.length > 0)
      return `posted in #${channelName}: "${truncateText(trimmedText, 140)}"`;

    if (attachmentsCount > 0)
      return `shared an attachment in #${channelName}.`;

    return `posted in #${channelName}.`;
  }
}
