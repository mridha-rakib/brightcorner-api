import type {
  CreateChannelInput,
  CreateJoinRequestInput,
  ListChannelsInput,
} from "@/modules/channels/channels.interface.js";
import type {
  ChannelDetail,
  ChannelDocument,
  ChannelMember,
  ChannelMembershipDocument,
  ChannelSummary,
} from "@/modules/channels/channels.type.js";

import { ChannelsRepository } from "@/modules/channels/channels.repository.js";
import {
  buildChannelQuestions,
  normalizeChannelName,
  toChannelSummary,
} from "@/modules/channels/channels.utils.js";
import { MessagesRepository } from "@/modules/messages/messages.repository.js";
import { resolveMessagePreview } from "@/modules/messages/messages.utils.js";
import { NotificationsService } from "@/modules/notifications/notifications.service.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { toPublicUser } from "@/modules/users/users.utils.js";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils.js";

const CHANNEL_MEMBER_ROLE_ORDER = {
  owner: 0,
  admin: 1,
  member: 2,
} as const;

export class ChannelsService {
  constructor(
    private readonly channelsRepository: ChannelsRepository = new ChannelsRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly messagesRepository: MessagesRepository = new MessagesRepository(),
    private readonly notificationsService: NotificationsService = new NotificationsService(),
  ) {}

  async listChannels(userId: string, input: ListChannelsInput): Promise<ChannelSummary[]> {
    const channels = await this.channelsRepository.listChannels(input.search?.trim() || undefined);
    const memberships = await this.channelsRepository.findMembershipsForUser(userId);
    const joinRequests = await this.channelsRepository.findJoinRequestsForUser(userId);

    const membershipMap = new Map(memberships.map(membership => [String(membership.channelId), membership]));
    const joinRequestMap = new Map(joinRequests.map(joinRequest => [String(joinRequest.channelId), joinRequest]));

    const visibleChannels = channels.filter((channel) => {
      const membership = membershipMap.get(channel.id);

      if (input.scope === "joined")
        return Boolean(membership);

      if (input.scope === "discoverable")
        return !membership;

      return true;
    });

    return Promise.all(
      visibleChannels.map(channel =>
        this.buildChannelSummary({
          channel,
          membership: membershipMap.get(channel.id) ?? null,
          joinRequest: joinRequestMap.get(channel.id) ?? null,
        })),
    );
  }

  async createChannel(userId: string, input: CreateChannelInput): Promise<ChannelDetail> {
    const channelName = normalizeChannelName(input.name);
    const existingChannel = await this.channelsRepository.findByName(channelName);

    if (existingChannel)
      throw new ConflictException("A channel with this name already exists.");

    const channel = await this.channelsRepository.createChannel({
      name: channelName,
      description: input.description?.trim(),
      privacy: input.privacy,
      iconUrl: input.iconUrl?.trim(),
      questions: input.privacy === "private" ? buildChannelQuestions(input.questions) : [],
      createdBy: userId,
    });

    await this.channelsRepository.createMembership({
      channelId: channel.id,
      userId,
      role: "owner",
    });

    return this.getChannelById(userId, channel.id);
  }

  async getChannelById(userId: string, channelId: string): Promise<ChannelDetail> {
    const channel = await this.getChannelDocument(channelId);
    const membership = await this.channelsRepository.findMembership(channelId, userId);
    const joinRequest = await this.channelsRepository.findJoinRequest(channelId, userId);
    const summary = await this.buildChannelSummary({
      channel,
      membership,
      joinRequest,
    });

    return {
      ...summary,
      questions: channel.questions,
    };
  }

  async joinPublicChannel(userId: string, channelId: string): Promise<ChannelDetail> {
    const channel = await this.getChannelDocument(channelId);
    if (channel.privacy !== "public")
      throw new BadRequestException("Private channels require a join request.");

    const existingMembership = await this.channelsRepository.findMembership(channelId, userId);
    if (!existingMembership) {
      await this.channelsRepository.createMembership({
        channelId,
        userId,
        role: "member",
      });
      await this.channelsRepository.touchChannel(channelId);
    }

    return this.getChannelById(userId, channel.id);
  }

  async requestJoinPrivateChannel(
    userId: string,
    channelId: string,
    input: CreateJoinRequestInput,
  ): Promise<ChannelDetail> {
    const channel = await this.getChannelDocument(channelId);
    if (channel.privacy !== "private")
      throw new BadRequestException("Public channels can be joined directly.");

    const membership = await this.channelsRepository.findMembership(channelId, userId);
    if (membership)
      return this.getChannelById(userId, channelId);

    const answers = input.answers ?? [];
    this.validateJoinRequestAnswers(channel, answers);

    await this.channelsRepository.upsertJoinRequest({
      channelId,
      userId,
      answers,
      reason: input.reason?.trim(),
    });
    await this.channelsRepository.touchChannel(channelId);
    await this.notificationsService.notifyPrivateChannelJoinRequest({
      channelId,
      requesterId: userId,
    });

    return this.getChannelById(userId, channel.id);
  }

  async listMembers(userId: string, channelId: string): Promise<ChannelMember[]> {
    await this.ensureJoinedMembership(userId, channelId);

    const memberships = await this.channelsRepository.listMemberships(channelId);
    const memberUsers = await this.usersRepository.findManyByIds(
      memberships.map(membership => String(membership.userId)),
    );
    const userMap = new Map(memberUsers.map(user => [user.id, user]));

    const members = memberships.reduce<ChannelMember[]>((accumulator, membership) => {
      const user = userMap.get(String(membership.userId));
      if (!user)
        return accumulator;

      const publicUser = toPublicUser(user);

      accumulator.push({
        userId: publicUser.id,
        role: membership.role,
        joinedAt: membership.createdAt,
        isOnline: false,
        user: {
          id: publicUser.id,
          firstName: publicUser.firstName,
          lastName: publicUser.lastName,
          fullName: publicUser.fullName,
          email: publicUser.email,
          profile: { ...publicUser.profile },
        },
      });

      return accumulator;
    }, []);

    return members.sort((firstMember, secondMember) => {
      const roleDelta
        = CHANNEL_MEMBER_ROLE_ORDER[firstMember.role] - CHANNEL_MEMBER_ROLE_ORDER[secondMember.role];

      if (roleDelta !== 0)
        return roleDelta;

      return firstMember.joinedAt.getTime() - secondMember.joinedAt.getTime();
    });
  }

  async ensureJoinedMembership(
    userId: string,
    channelId: string,
  ): Promise<ChannelMembershipDocument> {
    await this.getChannelDocument(channelId);

    const membership = await this.channelsRepository.findMembership(channelId, userId);
    if (!membership)
      throw new ForbiddenException("You must join this channel before accessing it.");

    return membership;
  }

  private async getChannelDocument(channelId: string): Promise<ChannelDocument> {
    const channel = await this.channelsRepository.findById(channelId);
    if (!channel)
      throw new NotFoundException("Channel not found.");

    return channel;
  }

  private validateJoinRequestAnswers(
    channel: ChannelDocument,
    answers: NonNullable<CreateJoinRequestInput["answers"]>,
  ): void {
    if (channel.questions.length === 0) {
      if (answers.length > 0)
        throw new BadRequestException("This channel does not require join request answers.");

      return;
    }

    if (answers.length !== channel.questions.length) {
      throw new BadRequestException("Answers are required for every join request question.");
    }

    const questionMap = new Map(channel.questions.map(question => [question.questionId, question]));
    const answeredQuestionIds = new Set<string>();

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question)
        throw new BadRequestException("Join request answers contain an invalid question.");

      if (!question.options.includes(answer.answer)) {
        throw new BadRequestException("Join request answers must match one of the configured options.");
      }

      answeredQuestionIds.add(answer.questionId);
    }

    if (answeredQuestionIds.size !== channel.questions.length) {
      throw new BadRequestException("Answers are required for every join request question.");
    }
  }

  private async buildChannelSummary(input: {
    channel: ChannelDocument;
    membership: ChannelMembershipDocument | null;
    joinRequest: Awaited<ReturnType<ChannelsRepository["findJoinRequest"]>>;
  }): Promise<ChannelSummary> {
    const [members, totalAdmins, lastMessage] = await Promise.all([
      this.channelsRepository.countMemberships(input.channel.id),
      this.channelsRepository.countAdmins(input.channel.id),
      this.messagesRepository.findLatestMessage({
        chatType: "channel",
        chatId: input.channel.id,
      }),
    ]);

    return toChannelSummary({
      channel: input.channel,
      membership: input.membership,
      joinRequest: input.joinRequest ?? null,
      members,
      totalAdmins,
      lastMessage: resolveMessagePreview(lastMessage),
      lastMessageAt: lastMessage?.createdAt ?? null,
    });
  }
}
