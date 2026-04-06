import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";

import type { MessageChatType, MessageResponse } from "@/modules/messages/messages.type.js";
import type { PublicUser } from "@/modules/users/users.type.js";

import { AUTH_CONSTANTS } from "@/common/auth/auth.constants.js";
import { TokenService } from "@/common/auth/token.service.js";
import { env } from "@/env.js";
import { ChannelsRepository } from "@/modules/channels/channels.repository.js";
import { ConversationsRepository } from "@/modules/conversations/conversations.repository.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { toPublicUser } from "@/modules/users/users.utils.js";
import { logger } from "@/utils/logger.js";
import { Server, type Socket } from "socket.io";

type RealtimeSocket = Socket & {
  data: {
    user: PublicUser;
  };
};

type TypingPayload = {
  chatId: string;
  chatType: MessageChatType;
};

type CallSignalPayload = {
  callId: string;
  signal: unknown;
};

type ActiveCall = {
  callId: string;
  conversationId: string;
  participantIds: [string, string];
  initiatedAt: string;
  initiatedBy: string;
  answeredAt?: string;
  answeredBy?: string;
};

function userRoom(userId: string): string {
  return `user:${userId}`;
}

function parseCookieHeader(header?: string): Record<string, string> {
  if (!header)
    return {};

  return header
    .split(";")
    .map(segment => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, segment) => {
      const separatorIndex = segment.indexOf("=");

      if (separatorIndex === -1)
        return cookies;

      const key = decodeURIComponent(segment.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(segment.slice(separatorIndex + 1).trim());

      cookies[key] = value;
      return cookies;
    }, {});
}

export class RealtimeGateway {
  private io: Server | null = null;
  private readonly presenceByUserId = new Map<string, Set<string>>();
  private readonly activeCalls = new Map<string, ActiveCall>();

  constructor(
    private readonly tokenService: TokenService = new TokenService(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly conversationsRepository: ConversationsRepository = new ConversationsRepository(),
    private readonly channelsRepository: ChannelsRepository = new ChannelsRepository(),
  ) {}

  initialize(server: HttpServer): void {
    if (this.io)
      return;

    this.io = new Server(server, {
      cors: {
        origin: env.CORS_ORIGINS,
        credentials: true,
      },
    });

    this.io.use(async (socket, next) => {
      try {
        const user = await this.authenticateSocket(socket);
        (socket as RealtimeSocket).data.user = user;
        next();
      }
      catch (error) {
        logger.warn("Rejected realtime connection", {
          error: error instanceof Error ? error.message : String(error),
        });
        next(new Error("Unauthorized"));
      }
    });

    this.io.on("connection", socket => this.handleConnection(socket as RealtimeSocket));
  }

  async shutdown(): Promise<void> {
    if (!this.io)
      return;

    await this.io.close();
    this.io = null;
    this.presenceByUserId.clear();
    this.activeCalls.clear();
  }

  async broadcastMessageCreated(message: MessageResponse): Promise<void> {
    if (!this.io)
      return;

    const audienceUserIds = await this.resolveChatAudience(message.chatType, message.chatId);
    this.emitToUsers(audienceUserIds, "message:created", message);
  }

  private async authenticateSocket(socket: Socket): Promise<PublicUser> {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const cookieToken = cookies[AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE_NAME];
    const authToken = this.extractBearerToken(socket);
    const accessToken = cookieToken || authToken;

    if (!accessToken)
      throw new Error("Missing access token");

    const payload = this.tokenService.verifyAccessToken(accessToken);
    const user = await this.usersRepository.findActiveById(payload.sub);
    if (!user)
      throw new Error("User not found");

    return toPublicUser(user);
  }

  private extractBearerToken(socket: Socket): string | undefined {
    const authorizationHeader = socket.handshake.headers.authorization;
    if (typeof authorizationHeader === "string" && authorizationHeader.startsWith("Bearer "))
      return authorizationHeader.slice(7);

    const auth = socket.handshake.auth as { authorization?: string; token?: string } | undefined;
    if (typeof auth?.authorization === "string" && auth.authorization.startsWith("Bearer "))
      return auth.authorization.slice(7);

    if (typeof auth?.token === "string" && auth.token.length > 0)
      return auth.token;

    return undefined;
  }

  private handleConnection(socket: RealtimeSocket): void {
    const { user } = socket.data;
    const wasAlreadyOnline = this.markUserOnline(user.id, socket.id);

    socket.join(userRoom(user.id));
    socket.emit("presence:snapshot", {
      userIds: [...this.presenceByUserId.keys()],
    });

    if (!wasAlreadyOnline) {
      this.io?.emit("presence:update", {
        isOnline: true,
        userId: user.id,
      });
    }

    socket.on("typing:start", (payload: TypingPayload) => {
      void this.handleTypingEvent(socket, payload, true);
    });

    socket.on("typing:stop", (payload: TypingPayload) => {
      void this.handleTypingEvent(socket, payload, false);
    });

    socket.on("call:start", (payload: { conversationId: string }) => {
      void this.handleCallStart(socket, payload.conversationId);
    });

    socket.on("call:accept", (payload: { callId: string }) => {
      this.handleCallAcceptance(socket, payload.callId);
    });

    socket.on("call:reject", (payload: { callId: string }) => {
      this.handleCallRejection(socket, payload.callId);
    });

    socket.on("call:end", (payload: { callId: string }) => {
      this.handleCallEnded(socket, payload.callId, "ended");
    });

    socket.on("call:signal", (payload: CallSignalPayload) => {
      this.handleCallSignal(socket, payload);
    });

    socket.on("disconnect", () => {
      this.handleDisconnect(socket);
    });
  }

  private async handleTypingEvent(
    socket: RealtimeSocket,
    payload: TypingPayload,
    isTyping: boolean,
  ): Promise<void> {
    const audienceUserIds = await this.resolveChatAudience(
      payload.chatType,
      payload.chatId,
      socket.data.user.id,
    ).catch(() => []);

    if (audienceUserIds.length === 0)
      return;

    this.emitToUsers(
      audienceUserIds.filter(userId => userId !== socket.data.user.id),
      "typing:update",
      {
        chatId: payload.chatId,
        chatType: payload.chatType,
        isTyping,
        user: socket.data.user,
      },
    );
  }

  private async handleCallStart(socket: RealtimeSocket, conversationId: string): Promise<void> {
    const { user } = socket.data;
    const conversation = await this.conversationsRepository.findById(conversationId);

    if (!conversation) {
      socket.emit("call:error", { message: "Conversation not found." });
      return;
    }

    const participantIds = conversation.participantIds.map(
      (participantId: (typeof conversation.participantIds)[number]) => String(participantId),
    ) as [string, string];
    if (!participantIds.includes(user.id)) {
      socket.emit("call:error", { message: "You do not have access to this conversation." });
      return;
    }

    const recipientUserId = participantIds.find(participantId => participantId !== user.id);
    if (!recipientUserId) {
      socket.emit("call:error", { message: "Conversation participant not found." });
      return;
    }

    if (!this.isUserOnline(recipientUserId)) {
      socket.emit("call:error", { message: "The other participant is offline." });
      return;
    }

    if (this.findCallForConversation(conversationId) || this.findCallForUser(user.id) || this.findCallForUser(recipientUserId)) {
      socket.emit("call:error", { message: "A call is already active for one of the participants." });
      return;
    }

    const recipient = await this.usersRepository.findActiveById(recipientUserId);
    if (!recipient) {
      socket.emit("call:error", { message: "Conversation participant not found." });
      return;
    }

    const callId = randomUUID();
    const activeCall: ActiveCall = {
      callId,
      conversationId,
      participantIds,
      initiatedAt: new Date().toISOString(),
      initiatedBy: user.id,
    };

    this.activeCalls.set(callId, activeCall);

    const recipientUser = toPublicUser(recipient);

    this.emitToUser(user.id, "call:outgoing", {
      callId,
      conversationId,
      initiatedAt: activeCall.initiatedAt,
      participant: recipientUser,
    });

    this.emitToUser(recipientUserId, "call:incoming", {
      callId,
      conversationId,
      initiatedAt: activeCall.initiatedAt,
      participant: user,
    });
  }

  private handleCallAcceptance(socket: RealtimeSocket, callId: string): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall)
      return;

    if (!activeCall.participantIds.includes(socket.data.user.id))
      return;

    if (!activeCall.answeredAt) {
      activeCall.answeredAt = new Date().toISOString();
      activeCall.answeredBy = socket.data.user.id;
    }

    this.emitToUsers(activeCall.participantIds, "call:accepted", {
      answeredAt: activeCall.answeredAt,
      answeredBy: activeCall.answeredBy,
      callId: activeCall.callId,
      conversationId: activeCall.conversationId,
    });
  }

  private handleCallRejection(socket: RealtimeSocket, callId: string): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall || !activeCall.participantIds.includes(socket.data.user.id))
      return;

    this.emitToUsers(activeCall.participantIds, "call:rejected", {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId,
      rejectedBy: socket.data.user.id,
    });

    this.activeCalls.delete(callId);
  }

  private handleCallEnded(
    socket: RealtimeSocket,
    callId: string,
    reason: "disconnected" | "ended",
  ): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall || !activeCall.participantIds.includes(socket.data.user.id))
      return;

    this.emitToUsers(activeCall.participantIds, "call:ended", {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId,
      endedBy: socket.data.user.id,
      reason,
    });

    this.activeCalls.delete(callId);
  }

  private handleCallSignal(socket: RealtimeSocket, payload: CallSignalPayload): void {
    const activeCall = this.activeCalls.get(payload.callId);
    if (!activeCall || !activeCall.participantIds.includes(socket.data.user.id))
      return;

    const recipientIds = activeCall.participantIds.filter(userId => userId !== socket.data.user.id);
    this.emitToUsers(recipientIds, "call:signal", {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId,
      fromUserId: socket.data.user.id,
      signal: payload.signal,
    });
  }

  private handleDisconnect(socket: RealtimeSocket): void {
    const { user } = socket.data;
    const isStillOnline = this.markUserOffline(user.id, socket.id);

    if (isStillOnline)
      return;

    this.io?.emit("presence:update", {
      isOnline: false,
      userId: user.id,
    });

    for (const [callId, activeCall] of [...this.activeCalls.entries()]) {
      if (!activeCall.participantIds.includes(user.id))
        continue;

      this.emitToUsers(activeCall.participantIds, "call:ended", {
        callId: activeCall.callId,
        conversationId: activeCall.conversationId,
        endedBy: user.id,
        reason: "disconnected",
      });
      this.activeCalls.delete(callId);
    }
  }

  private markUserOnline(userId: string, socketId: string): boolean {
    const connections = this.presenceByUserId.get(userId);
    if (connections) {
      connections.add(socketId);
      return true;
    }

    this.presenceByUserId.set(userId, new Set([socketId]));
    return false;
  }

  private markUserOffline(userId: string, socketId: string): boolean {
    const connections = this.presenceByUserId.get(userId);
    if (!connections)
      return false;

    connections.delete(socketId);
    if (connections.size > 0)
      return true;

    this.presenceByUserId.delete(userId);
    return false;
  }

  private isUserOnline(userId: string): boolean {
    return this.presenceByUserId.has(userId);
  }

  private findCallForConversation(conversationId: string): ActiveCall | undefined {
    return [...this.activeCalls.values()].find(call => call.conversationId === conversationId);
  }

  private findCallForUser(userId: string): ActiveCall | undefined {
    return [...this.activeCalls.values()].find(call => call.participantIds.includes(userId));
  }

  private emitToUser(userId: string, event: string, payload: unknown): void {
    this.io?.to(userRoom(userId)).emit(event, payload);
  }

  private emitToUsers(userIds: string[], event: string, payload: unknown): void {
    for (const userId of [...new Set(userIds)])
      this.emitToUser(userId, event, payload);
  }

  private async resolveChatAudience(
    chatType: MessageChatType,
    chatId: string,
    requestingUserId?: string,
  ): Promise<string[]> {
    if (chatType === "conversation") {
      const conversation = await this.conversationsRepository.findById(chatId);
      if (!conversation)
        return [];

      const participantIds = conversation.participantIds.map(
        (participantId: (typeof conversation.participantIds)[number]) => String(participantId),
      );
      if (requestingUserId && !participantIds.includes(requestingUserId))
        return [];

      return participantIds;
    }

    const memberships = await this.channelsRepository.listMemberships(chatId);
    const memberUserIds = memberships.map(membership => String(membership.userId));

    if (requestingUserId && !memberUserIds.includes(requestingUserId))
      return [];

    return memberUserIds;
  }
}

export const realtimeGateway = new RealtimeGateway();
