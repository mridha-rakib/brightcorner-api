import type {
  CreateChannelInput,
  CreateJoinRequestInput,
  ListChannelsInput,
  ReviewJoinRequestInput,
  UpdateChannelMessagingPermissionsInput,
  UpdateChannelSubscriptionInput,
} from "@/modules/channels/channels.interface.js";
import type {
  ChannelDetail,
  ChannelDocument,
  ChannelJoinRequestDocument,
  ChannelJoinRequestResponse,
  ChannelMember,
  ChannelMembershipDocument,
  ChannelSummary,
} from "@/modules/channels/channels.type.js";
import type { UserDocument } from "@/modules/users/users.type.js";

import { ChannelsRepository } from "@/modules/channels/channels.repository.js";
import {
  buildChannelQuestions,
  normalizeChannelName,
  toChannelSummary,
} from "@/modules/channels/channels.utils.js";
import { MessageReadStateRepository } from "@/modules/messages/message-read-state.repository.js";
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
    private readonly messageReadStateRepository: MessageReadStateRepository = new MessageReadStateRepository(),
    private readonly notificationsService: NotificationsService = new NotificationsService(),
  ) {}

  async listChannels(userId: string, input: ListChannelsInput): Promise<ChannelSummary[]> {
    const [channels, memberships, joinRequests, readStates] = await Promise.all([
      this.channelsRepository.listChannels(input.search?.trim() || undefined),
      this.channelsRepository.findMembershipsForUser(userId),
      this.channelsRepository.findJoinRequestsForUser(userId),
      this.messageReadStateRepository.listForUser(userId),
    ]);

    const membershipMap = new Map(memberships.map(membership => [String(membership.channelId), membership]));
    const joinRequestMap = new Map(joinRequests.map(joinRequest => [String(joinRequest.channelId), joinRequest]));
    const readStateMap = new Map(
      readStates
        .filter(readState => readState.chatType === "channel")
        .map(readState => [String(readState.chatId), readState]),
    );

    const visibleChannels = channels.filter((channel) => {
      const membership = membershipMap.get(channel.id);
      const isOwnedChannel = membership?.role === "owner" && String(channel.createdBy) === userId;

      if (input.scope === "owned")
        return isOwnedChannel;

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
          readState: readStateMap.get(channel.id) ?? null,
          userId,
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
    const [membership, joinRequest, readState] = await Promise.all([
      this.channelsRepository.findMembership(channelId, userId),
      this.channelsRepository.findJoinRequest(channelId, userId),
      this.messageReadStateRepository.findByUserAndChat({
        chatId: channelId,
        chatType: "channel",
        userId,
      }),
    ]);
    const summary = await this.buildChannelSummary({
      channel,
      membership,
      joinRequest,
      readState,
      userId,
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

  async listJoinRequests(userId: string, channelId: string): Promise<ChannelJoinRequestResponse[]> {
    const channel = await this.getChannelDocument(channelId);
    this.ensurePrivateChannel(channel);
    await this.ensureJoinRequestManager(userId, channelId);

    const joinRequests = await this.channelsRepository.listPendingJoinRequests(channelId);
    const requesterUsers = await this.usersRepository.findManyByIds(
      joinRequests.map(joinRequest => String(joinRequest.userId)),
    );
    const requesterMap = new Map(requesterUsers.map(user => [user.id, user]));

    return joinRequests.reduce<ChannelJoinRequestResponse[]>((accumulator, joinRequest) => {
      const requester = requesterMap.get(String(joinRequest.userId));
      if (!requester)
        return accumulator;

      accumulator.push(this.toJoinRequestResponse(joinRequest, requester));
      return accumulator;
    }, []);
  }

  async reviewJoinRequest(
    userId: string,
    channelId: string,
    requestId: string,
    input: ReviewJoinRequestInput,
  ): Promise<ChannelJoinRequestResponse> {
    const channel = await this.getChannelDocument(channelId);
    this.ensurePrivateChannel(channel);
    await this.ensureJoinRequestManager(userId, channelId);

    const joinRequest = await this.channelsRepository.findJoinRequestById(channelId, requestId);
    if (!joinRequest)
      throw new NotFoundException("Join request not found.");

    if (joinRequest.status !== "pending")
      throw new ConflictException("This join request has already been reviewed.");

    const requesterId = String(joinRequest.userId);
    if (input.action === "approve") {
      const existingMembership = await this.channelsRepository.findMembership(channelId, requesterId);
      if (!existingMembership) {
        await this.channelsRepository.createMembership({
          channelId,
          userId: requesterId,
          role: "member",
        });
      }

      joinRequest.status = "approved";
      await joinRequest.save();
      await this.notificationsService.notifyPrivateChannelJoinRequestApproved({
        channelId,
        requesterId,
        reviewerId: userId,
      });
    }
    else {
      joinRequest.status = "rejected";
      await joinRequest.save();
      await this.notificationsService.notifyPrivateChannelJoinRequestRejected({
        channelId,
        requesterId,
        reviewerId: userId,
      });
    }

    await this.channelsRepository.touchChannel(channelId);

    const requester = await this.usersRepository.findById(requesterId);
    if (!requester)
      throw new NotFoundException("Requester not found.");

    return this.toJoinRequestResponse(joinRequest, requester);
  }

  async updateChannelSubscription(
    userId: string,
    channelId: string,
    input: UpdateChannelSubscriptionInput,
  ): Promise<ChannelDetail> {
    const membership = await this.ensureJoinedMembership(userId, channelId);
    membership.subscribed = input.subscribed;
    await membership.save();

    return this.getChannelById(userId, channelId);
  }

  async updateChannelMessagingPermissions(
    userId: string,
    channelId: string,
    input: UpdateChannelMessagingPermissionsInput,
  ): Promise<ChannelDetail> {
    await this.ensureChannelManager(userId, channelId);

    const channel = await this.channelsRepository.updateMessagingPermissions(
      channelId,
      input.membersCanMessage,
    );
    if (!channel)
      throw new NotFoundException("Channel not found.");

    return this.getChannelById(userId, channelId);
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

  private ensurePrivateChannel(channel: ChannelDocument): void {
    if (channel.privacy !== "private")
      throw new BadRequestException("Public channels do not support join requests.");
  }

  private async ensureJoinRequestManager(
    userId: string,
    channelId: string,
  ): Promise<ChannelMembershipDocument> {
    return this.ensureChannelManager(userId, channelId, "Only owners and admins can manage join requests.");
  }

  private async ensureChannelManager(
    userId: string,
    channelId: string,
    forbiddenMessage = "Only owners and admins can manage this channel.",
  ): Promise<ChannelMembershipDocument> {
    const membership = await this.ensureJoinedMembership(userId, channelId);
    if (!["owner", "admin"].includes(membership.role))
      throw new ForbiddenException(forbiddenMessage);

    return membership;
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
    readState: Awaited<ReturnType<MessageReadStateRepository["listForUser"]>>[number] | null;
    userId: string;
  }): Promise<ChannelSummary> {
    const [members, totalAdmins, lastMessage, unread] = await Promise.all([
      this.channelsRepository.countMemberships(input.channel.id),
      this.channelsRepository.countAdmins(input.channel.id),
      this.messagesRepository.findLatestMessage({
        chatType: "channel",
        chatId: input.channel.id,
      }),
      input.membership
        ? this.messagesRepository.countUnreadMessages({
            chatId: input.channel.id,
            chatType: "channel",
            lastReadAt: input.readState?.lastReadAt ?? null,
            userId: input.userId,
          })
        : Promise.resolve(0),
    ]);

    return toChannelSummary({
      channel: input.channel,
      membership: input.membership,
      joinRequest: input.joinRequest ?? null,
      unread,
      members,
      totalAdmins,
      lastMessage: resolveMessagePreview(lastMessage),
      lastMessageAt: lastMessage?.createdAt ?? null,
    });
  }

  private toJoinRequestResponse(
    joinRequest: ChannelJoinRequestDocument,
    requesterUser: UserDocument,
  ): ChannelJoinRequestResponse {
    const requester = toPublicUser(requesterUser);

    return {
      id: joinRequest.id,
      channelId: String(joinRequest.channelId),
      answers: joinRequest.answers,
      reason: joinRequest.reason,
      status: joinRequest.status,
      createdAt: joinRequest.createdAt,
      updatedAt: joinRequest.updatedAt,
      requester: {
        id: requester.id,
        firstName: requester.firstName,
        lastName: requester.lastName,
        fullName: requester.fullName,
        email: requester.email,
        profile: { ...requester.profile },
      },
    };
  }
}
