import {
  body,
  emptyResponse,
  errors,
  nullData,
  objectIdParam,
  response,
  searchParam,
  secured,
  unlockHeader,
} from "@/config/swagger.helpers.js";

export const messagingSwaggerPaths = {
  "/channels": {
    get: {
      tags: ["Channels"],
      summary: "List channels",
      security: secured,
      parameters: [
        {
          name: "scope",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["all", "joined", "discoverable"] },
        },
        searchParam,
      ],
      responses: {
        ...response("Channels fetched", {
          type: "array",
          items: { $ref: "#/components/schemas/ChannelSummary" },
        }),
        ...errors(400, 401, 429, 500),
      },
    },
    post: {
      tags: ["Channels"],
      summary: "Create a channel",
      security: secured,
      requestBody: body("#/components/schemas/CreateChannelRequest"),
      responses: {
        ...response("Channel created", { $ref: "#/components/schemas/ChannelDetail" }, 201),
        ...errors(400, 401, 409, 413, 429, 500),
      },
    },
  },
  "/channels/{channelId}": {
    get: {
      tags: ["Channels"],
      summary: "Get a channel by ID",
      security: secured,
      parameters: [objectIdParam("channelId", "Channel ID")],
      responses: {
        ...response("Channel fetched", { $ref: "#/components/schemas/ChannelDetail" }),
        ...errors(400, 401, 404, 429, 500),
      },
    },
  },
  "/channels/{channelId}/join": {
    post: {
      tags: ["Channels"],
      summary: "Join a public channel",
      security: secured,
      parameters: [objectIdParam("channelId", "Channel ID")],
      responses: {
        ...response("Channel joined", { $ref: "#/components/schemas/ChannelDetail" }),
        ...errors(400, 401, 404, 429, 500),
      },
    },
  },
  "/channels/{channelId}/subscription": {
    patch: {
      tags: ["Channels"],
      summary: "Update channel subscription",
      security: secured,
      parameters: [objectIdParam("channelId", "Channel ID")],
      requestBody: body("#/components/schemas/UpdateChannelSubscriptionRequest"),
      responses: {
        ...response("Channel subscription updated", {
          $ref: "#/components/schemas/ChannelDetail",
        }),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
  "/channels/{channelId}/join-requests": {
    get: {
      tags: ["Channels"],
      summary: "List pending join requests",
      security: secured,
      parameters: [objectIdParam("channelId", "Channel ID")],
      responses: {
        ...response("Join requests fetched", {
          type: "array",
          items: { $ref: "#/components/schemas/ChannelJoinRequest" },
        }),
        ...errors(400, 401, 403, 404, 429, 500),
      },
    },
    post: {
      tags: ["Channels"],
      summary: "Request to join a private channel",
      security: secured,
      parameters: [objectIdParam("channelId", "Channel ID")],
      requestBody: body("#/components/schemas/CreateJoinRequest"),
      responses: {
        ...response("Join request submitted", {
          $ref: "#/components/schemas/ChannelDetail",
        }),
        ...errors(400, 401, 404, 413, 429, 500),
      },
    },
  },
  "/channels/{channelId}/join-requests/{requestId}": {
    patch: {
      tags: ["Channels"],
      summary: "Approve or reject a join request",
      security: secured,
      parameters: [
        objectIdParam("channelId", "Channel ID"),
        objectIdParam("requestId", "Join request ID"),
      ],
      requestBody: body("#/components/schemas/ReviewJoinRequest"),
      responses: {
        ...response("Join request reviewed", {
          $ref: "#/components/schemas/ChannelJoinRequest",
        }),
        ...errors(400, 401, 403, 404, 409, 413, 429, 500),
      },
    },
  },
  "/channels/{channelId}/members": {
    get: {
      tags: ["Channels"],
      summary: "List channel members",
      security: secured,
      parameters: [objectIdParam("channelId", "Channel ID")],
      responses: {
        ...response("Channel members fetched", {
          type: "array",
          items: { $ref: "#/components/schemas/ChannelMember" },
        }),
        ...errors(400, 401, 403, 404, 429, 500),
      },
    },
  },
  "/conversations": {
    get: {
      tags: ["Conversations"],
      summary: "List my direct conversations",
      security: secured,
      parameters: [searchParam],
      responses: {
        ...response("Conversations fetched", {
          type: "array",
          items: { $ref: "#/components/schemas/ConversationSummary" },
        }),
        ...errors(400, 401, 429, 500),
      },
    },
  },
  "/conversations/direct": {
    post: {
      tags: ["Conversations"],
      summary: "Create or fetch a direct conversation",
      security: secured,
      requestBody: body("#/components/schemas/CreateDirectConversationRequest"),
      responses: {
        ...response("Conversation ready", {
          $ref: "#/components/schemas/ConversationSummary",
        }),
        ...errors(400, 401, 404, 413, 429, 500),
      },
    },
  },
  "/conversations/{conversationId}/unlock": {
    post: {
      tags: ["Conversations"],
      summary: "Unlock a PIN-protected conversation",
      security: secured,
      parameters: [objectIdParam("conversationId", "Conversation ID")],
      requestBody: body("#/components/schemas/UnlockConversationRequest"),
      responses: {
        ...response("Conversation unlocked", {
          $ref: "#/components/schemas/ConversationUnlockResponse",
        }),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
  "/conversations/{conversationId}/lock": {
    post: {
      tags: ["Conversations"],
      summary: "Lock a PIN-protected conversation",
      security: secured,
      parameters: [objectIdParam("conversationId", "Conversation ID"), unlockHeader],
      responses: {
        ...response("Conversation locked", {
          $ref: "#/components/schemas/ConversationSummary",
        }),
        ...errors(400, 401, 403, 404, 429, 500),
      },
    },
  },
  "/conversations/{conversationId}": {
    get: {
      tags: ["Conversations"],
      summary: "Get a direct conversation by ID",
      security: secured,
      parameters: [objectIdParam("conversationId", "Conversation ID"), unlockHeader],
      responses: {
        ...response("Conversation fetched", {
          $ref: "#/components/schemas/ConversationSummary",
        }),
        ...errors(400, 401, 403, 404, 429, 500),
      },
    },
  },
  "/messages": {
    get: {
      tags: ["Messages"],
      summary: "List messages for a channel or conversation",
      security: secured,
      parameters: [
        unlockHeader,
        {
          name: "beforeMessageId",
          in: "query",
          required: false,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
        {
          name: "channelId",
          in: "query",
          required: false,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
        {
          name: "conversationId",
          in: "query",
          required: false,
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100, default: 40 },
        },
        {
          name: "pinnedOnly",
          in: "query",
          required: false,
          schema: { type: "boolean" },
        },
      ],
      responses: {
        ...response("Messages fetched", {
          $ref: "#/components/schemas/MessageListResponse",
        }),
        ...errors(400, 401, 403, 404, 429, 500),
      },
    },
    post: {
      tags: ["Messages"],
      summary: "Create a message",
      security: secured,
      parameters: [unlockHeader],
      requestBody: body("#/components/schemas/CreateMessageRequest"),
      responses: {
        ...response("Message sent", { $ref: "#/components/schemas/Message" }, 201),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
  "/messages/read": {
    post: {
      tags: ["Messages"],
      summary: "Mark a chat as read",
      security: secured,
      parameters: [unlockHeader],
      requestBody: body("#/components/schemas/MarkChatReadRequest"),
      responses: {
        ...response("Chat marked as read", nullData),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
  "/messages/{messageId}/reactions": {
    post: {
      tags: ["Messages"],
      summary: "Toggle a reaction on a message",
      security: secured,
      parameters: [objectIdParam("messageId", "Message ID"), unlockHeader],
      requestBody: body("#/components/schemas/ToggleReactionRequest"),
      responses: {
        ...response("Message reaction updated", { $ref: "#/components/schemas/Message" }),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
  "/notifications/me": {
    get: {
      tags: ["Notifications"],
      summary: "List my notifications",
      security: secured,
      responses: {
        ...response("Notifications fetched", {
          type: "array",
          items: { $ref: "#/components/schemas/Notification" },
        }),
        ...errors(401, 429, 500),
      },
    },
  },
  "/notifications/me/read-all": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark all my notifications as read",
      security: secured,
      responses: {
        ...emptyResponse("Notifications marked as read"),
        ...errors(401, 429, 500),
      },
    },
  },
  "/legal-content/{type}": {
    get: {
      tags: ["Legal Content"],
      summary: "Get legal content by type",
      parameters: [
        {
          name: "type",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["privacy", "terms", "about"] },
        },
      ],
      responses: {
        ...response("Legal content fetched", {
          $ref: "#/components/schemas/LegalContent",
        }),
        ...errors(400, 429, 500),
      },
    },
    put: {
      tags: ["Legal Content"],
      summary: "Create or update legal content",
      security: secured,
      parameters: [
        {
          name: "type",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["privacy", "terms", "about"] },
        },
      ],
      requestBody: body("#/components/schemas/UpsertLegalContentRequest"),
      responses: {
        ...response("Legal content updated", {
          $ref: "#/components/schemas/LegalContent",
        }),
        ...errors(400, 401, 403, 413, 429, 500),
      },
    },
  },
  "/support-requests": {
    post: {
      tags: ["Support Requests"],
      summary: "Submit a support request",
      security: secured,
      requestBody: body("#/components/schemas/CreateSupportRequest"),
      responses: {
        ...response("Support request submitted", {
          $ref: "#/components/schemas/SupportRequest",
        }, 201),
        ...errors(400, 401, 404, 413, 429, 500),
      },
    },
  },
};
