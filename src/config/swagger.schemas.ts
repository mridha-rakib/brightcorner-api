import {
  objectIdPattern,
  publicUser,
  publicUsers,
} from "@/config/swagger.helpers.js";

export const swaggerComponents = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "JWT access token in the Authorization header.",
    },
    accessCookie: {
      type: "apiKey",
      in: "cookie",
      name: "bc_access_token",
    },
    refreshCookie: {
      type: "apiKey",
      in: "cookie",
      name: "bc_refresh_token",
    },
  },
  schemas: {
    ObjectId: {
      type: "string",
      pattern: objectIdPattern,
      example: "65f1a9f1e13a6f3a6f3a6f3a",
    },
    DateTime: { type: "string", format: "date-time" },
    SuccessEnvelope: {
      type: "object",
      required: ["success", "message", "data", "timestamp"],
      properties: {
        success: { type: "boolean", enum: [true] },
        message: { type: "string" },
        data: {},
        timestamp: { $ref: "#/components/schemas/DateTime" },
      },
    },
    ErrorEnvelope: {
      type: "object",
      required: ["success", "error", "timestamp", "path"],
      properties: {
        success: { type: "boolean", enum: [false] },
        error: {
          type: "object",
          required: ["code", "message", "statusCode"],
          properties: {
            code: { type: "string", example: "VALIDATION_ERROR" },
            message: { type: "string", example: "Validation failed" },
            statusCode: { type: "integer", example: 400 },
            details: { nullable: true },
          },
        },
        timestamp: { $ref: "#/components/schemas/DateTime" },
        path: { type: "string", example: "/api/v1/auth/sign-in" },
        requestId: { type: "string" },
        stack: { type: "string" },
      },
    },
    UserProfile: {
      type: "object",
      properties: {
        username: {
          type: "string",
          minLength: 3,
          maxLength: 30,
          pattern: "^[\\w-]+$",
        },
        bio: { type: "string", maxLength: 1600 },
        avatarUrl: { type: "string", maxLength: 900000 },
      },
    },
    UserPrivacySettings: {
      type: "object",
      properties: {
        messagePreference: {
          type: "string",
          enum: ["everyone", "contacts", "nobody"],
        },
        anonymousMode: { type: "boolean" },
        onlineStatus: { type: "boolean" },
        publicProfile: { type: "boolean" },
        pinProtection: { type: "boolean" },
      },
    },
    UserNotificationSettings: {
      type: "object",
      properties: {
        emailNotifications: { type: "boolean" },
        channelMentions: { type: "boolean" },
        pinAlerts: { type: "boolean" },
        joinRequestAlerts: { type: "boolean" },
      },
    },
    PublicUser: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        firstName: { type: "string", maxLength: 80 },
        lastName: { type: "string", maxLength: 80 },
        fullName: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["user", "admin"] },
        status: { type: "string", enum: ["active", "blocked"] },
        profile: { $ref: "#/components/schemas/UserProfile" },
        privacySettings: { $ref: "#/components/schemas/UserPrivacySettings" },
        notificationSettings: { $ref: "#/components/schemas/UserNotificationSettings" },
        onboardingCompleted: { type: "boolean" },
        isTwoFactorEnabled: { type: "boolean" },
        lastLoginAt: {
          allOf: [{ $ref: "#/components/schemas/DateTime" }],
          nullable: true,
        },
        createdAt: { $ref: "#/components/schemas/DateTime" },
        updatedAt: { $ref: "#/components/schemas/DateTime" },
      },
    },
    TwoFactorSettings: {
      type: "object",
      properties: {
        deliveryLabel: { type: "string", example: "ra***@example.com" },
        deliveryMethod: { type: "string", enum: ["email"] },
        enabled: { type: "boolean" },
        expiresAt: {
          allOf: [{ $ref: "#/components/schemas/DateTime" }],
          nullable: true,
        },
        lastSentAt: {
          allOf: [{ $ref: "#/components/schemas/DateTime" }],
          nullable: true,
        },
      },
    },
    TwoFactorChallenge: {
      allOf: [
        { $ref: "#/components/schemas/TwoFactorSettings" },
        {
          type: "object",
          properties: {
            requiresTwoFactor: { type: "boolean", enum: [true] },
            challengeToken: { type: "string" },
          },
        },
      ],
    },
    SignUpRequest: {
      type: "object",
      required: ["firstName", "lastName", "email", "password"],
      properties: {
        firstName: { type: "string", minLength: 1, maxLength: 80 },
        lastName: { type: "string", minLength: 1, maxLength: 80 },
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8, format: "password" },
      },
    },
    SignInRequest: {
      type: "object",
      required: ["identifier", "password"],
      properties: {
        identifier: {
          type: "string",
          description: "Email address or username.",
        },
        password: { type: "string", format: "password" },
      },
    },
    SignInData: {
      oneOf: [
        {
          type: "object",
          properties: {
            status: { type: "string", enum: ["authenticated"] },
            user: publicUser,
          },
        },
        {
          type: "object",
          properties: {
            status: { type: "string", enum: ["two_factor_required"] },
            challenge: { $ref: "#/components/schemas/TwoFactorChallenge" },
          },
        },
      ],
    },
    ChallengeTokenRequest: {
      type: "object",
      required: ["challengeToken"],
      properties: { challengeToken: { type: "string" } },
    },
    VerifySignInTwoFactorRequest: {
      type: "object",
      required: ["challengeToken", "code"],
      properties: {
        challengeToken: { type: "string" },
        code: { type: "string", pattern: "^\\d{6}$", example: "123456" },
      },
    },
    ForgotPasswordRequest: {
      type: "object",
      required: ["email"],
      properties: { email: { type: "string", format: "email" } },
    },
    ResetPasswordRequest: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: { type: "string" },
        password: { type: "string", minLength: 8, format: "password" },
      },
    },
    OnboardingRequest: {
      type: "object",
      required: ["username"],
      properties: {
        username: {
          type: "string",
          minLength: 3,
          maxLength: 30,
          pattern: "^[\\w-]+$",
        },
        bio: { type: "string", maxLength: 1600 },
        avatarUrl: { type: "string", maxLength: 900000 },
        privacySettings: { $ref: "#/components/schemas/UserPrivacySettings" },
        notificationSettings: { $ref: "#/components/schemas/UserNotificationSettings" },
      },
    },
    ProfileUpdateRequest: {
      type: "object",
      description: "Provide at least one field.",
      properties: {
        firstName: { type: "string", minLength: 1, maxLength: 80 },
        lastName: { type: "string", minLength: 1, maxLength: 80 },
        username: {
          type: "string",
          minLength: 3,
          maxLength: 30,
          pattern: "^[\\w-]+$",
        },
        bio: { type: "string", maxLength: 1600 },
        avatarUrl: { type: "string", maxLength: 900000 },
      },
    },
    ChangeEmailRequest: {
      type: "object",
      required: ["newEmail"],
      properties: { newEmail: { type: "string", format: "email" } },
    },
    ChangePasswordRequest: {
      type: "object",
      required: ["currentPassword", "newPassword"],
      properties: {
        currentPassword: { type: "string", format: "password" },
        newPassword: { type: "string", minLength: 8, format: "password" },
      },
    },
    DeleteAccountRequest: {
      type: "object",
      required: ["password"],
      properties: { password: { type: "string", format: "password" } },
    },
    VerifyTwoFactorRequest: {
      type: "object",
      required: ["code", "enabled"],
      properties: {
        code: { type: "string", pattern: "^\\d{6}$", example: "123456" },
        enabled: { type: "boolean" },
      },
    },
    AdminDashboardSummary: {
      type: "object",
      properties: {
        totalUsers: { type: "integer", minimum: 0 },
        blockedUsers: { type: "integer", minimum: 0 },
        recentUsers: publicUsers,
      },
    },
    AdminUpdateUserStatusRequest: {
      type: "object",
      required: ["status"],
      properties: { status: { type: "string", enum: ["active", "blocked"] } },
    },
    ChannelQuestion: {
      type: "object",
      properties: {
        questionId: { type: "string" },
        text: { type: "string", maxLength: 200 },
        options: { type: "array", items: { type: "string", maxLength: 120 } },
      },
    },
    ChannelQuestionInput: {
      type: "object",
      required: ["text", "options"],
      properties: {
        text: { type: "string", minLength: 1, maxLength: 200 },
        options: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1, maxLength: 120 },
        },
      },
    },
    ChannelSummary: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        type: { type: "string", enum: ["channel"] },
        name: { type: "string" },
        description: { type: "string", maxLength: 250 },
        iconUrl: { type: "string", maxLength: 2048 },
        isPublic: { type: "boolean" },
        isEncrypted: { type: "boolean", enum: [true] },
        membersCanMessage: {
          type: "boolean",
          description: "When false, only channel owners and admins can send messages.",
        },
        joinStatus: { type: "string", enum: ["joined", "not_joined", "pending"] },
        isSubscribed: { type: "boolean" },
        unread: { type: "integer", minimum: 0 },
        members: { type: "integer", minimum: 0 },
        totalAdmins: { type: "integer", minimum: 0 },
        online: { type: "integer", minimum: 0 },
        lastMessage: { type: "string", nullable: true },
        lastMessageAt: {
          allOf: [{ $ref: "#/components/schemas/DateTime" }],
          nullable: true,
        },
      },
    },
    ChannelDetail: {
      allOf: [
        { $ref: "#/components/schemas/ChannelSummary" },
        {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: { $ref: "#/components/schemas/ChannelQuestion" },
            },
          },
        },
      ],
    },
    CreateChannelRequest: {
      type: "object",
      required: ["name", "privacy"],
      properties: {
        name: {
          type: "string",
          minLength: 1,
          maxLength: 120,
          pattern: "^[a-z0-9-]+$",
        },
        description: { type: "string", maxLength: 250 },
        privacy: { type: "string", enum: ["public", "private"] },
        iconUrl: { type: "string", maxLength: 2048 },
        questions: {
          type: "array",
          items: { $ref: "#/components/schemas/ChannelQuestionInput" },
        },
      },
    },
    ChannelJoinAnswer: {
      type: "object",
      required: ["questionId", "answer"],
      properties: {
        questionId: { type: "string" },
        answer: { type: "string", minLength: 1, maxLength: 250 },
      },
    },
    CreateJoinRequest: {
      type: "object",
      properties: {
        answers: {
          type: "array",
          items: { $ref: "#/components/schemas/ChannelJoinAnswer" },
        },
        reason: { type: "string", maxLength: 1000 },
      },
    },
    ReviewJoinRequest: {
      type: "object",
      required: ["action"],
      properties: { action: { type: "string", enum: ["approve", "reject"] } },
    },
    ChannelMemberUser: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        fullName: { type: "string" },
        email: { type: "string", format: "email" },
        profile: { $ref: "#/components/schemas/UserProfile" },
      },
    },
    ChannelMember: {
      type: "object",
      properties: {
        userId: { $ref: "#/components/schemas/ObjectId" },
        role: { type: "string", enum: ["owner", "admin", "member"] },
        joinedAt: { $ref: "#/components/schemas/DateTime" },
        isOnline: { type: "boolean" },
        user: { $ref: "#/components/schemas/ChannelMemberUser" },
      },
    },
    ChannelJoinRequest: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        channelId: { $ref: "#/components/schemas/ObjectId" },
        answers: {
          type: "array",
          items: { $ref: "#/components/schemas/ChannelJoinAnswer" },
        },
        reason: { type: "string" },
        status: { type: "string", enum: ["pending", "approved", "rejected"] },
        createdAt: { $ref: "#/components/schemas/DateTime" },
        updatedAt: { $ref: "#/components/schemas/DateTime" },
        requester: { $ref: "#/components/schemas/ChannelMemberUser" },
      },
    },
    UpdateChannelSubscriptionRequest: {
      type: "object",
      required: ["subscribed"],
      properties: { subscribed: { type: "boolean" } },
    },
    UpdateChannelMessagingPermissionsRequest: {
      type: "object",
      required: ["membersCanMessage"],
      properties: {
        membersCanMessage: {
          type: "boolean",
          description: "Turn on to allow all channel members to send messages.",
        },
      },
    },
    ConversationSummary: {
      type: "object",
      properties: {
        id: { $ref: "#/components/schemas/ObjectId" },
        type: { type: "string", enum: ["dm"] },
        name: { type: "string" },
        avatarUrl: { type: "string" },
        isEncrypted: { type: "boolean", enum: [true] },
        isPinProtected: { type: "boolean" },
        isLocked: { type: "boolean" },
        unread: { type: "integer", minimum: 0 },
        lastMessage: { type: "string", nullable: true },
        lastMessageAt: {
          allOf: [{ $ref: "#/components/schemas/DateTime" }],
          nullable: true,
        },
        participant: publicUser,
      },
    },
    CreateDirectConversationRequest: {
      type: "object",
      required: ["participantUserId"],
      properties: {
        participantUserId: { $ref: "#/components/schemas/ObjectId" },
        pin: { type: "string", pattern: "^\\d{4}$", example: "1234" },
      },
    },
    UnlockConversationRequest: {
      type: "object",
      required: ["pin"],
      properties: {
        pin: { type: "string", pattern: "^\\d{4}$", example: "1234" },
      },
    },
    ConversationUnlockResponse: {
      type: "object",
      properties: {
        conversation: { $ref: "#/components/schemas/ConversationSummary" },
        unlockToken: { type: "string" },
      },
    },
    MessageAttachment: {
      type: "object",
      required: ["id", "name", "mimeType", "size", "url"],
      properties: {
        id: { type: "string", minLength: 1, maxLength: 64 },
        name: { type: "string", minLength: 1, maxLength: 255 },
        mimeType: { type: "string", minLength: 1, maxLength: 128 },
        size: { type: "integer", minimum: 1, maximum: 2097152 },
        url: { type: "string", minLength: 1, maxLength: 3000000 },
      },
    },
    MessageReactionSummary: {
      type: "object",
      properties: {
        count: { type: "integer", minimum: 0 },
        emoji: { type: "string", maxLength: 16 },
        reactedUserIds: {
          type: "array",
          items: { $ref: "#/components/schemas/ObjectId" },
        },
      },
    },
    MessageReplyReference: {
      type: "object",
      nullable: true,
      properties: {
        attachments: {
          type: "array",
          items: { $ref: "#/components/schemas/MessageAttachment" },
        },
        id: { $ref: "#/components/schemas/ObjectId" },
        sender: { $ref: "#/components/schemas/ChannelMemberUser" },
        text: { type: "string" },
      },
    },
    Message: {
      type: "object",
      properties: {
        attachments: {
          type: "array",
          items: { $ref: "#/components/schemas/MessageAttachment" },
        },
        id: { $ref: "#/components/schemas/ObjectId" },
        chatType: { type: "string", enum: ["channel", "conversation"] },
        chatId: { $ref: "#/components/schemas/ObjectId" },
        createdAt: { $ref: "#/components/schemas/DateTime" },
        pinned: { type: "boolean" },
        reactions: {
          type: "array",
          items: { $ref: "#/components/schemas/MessageReactionSummary" },
        },
        replyTo: { $ref: "#/components/schemas/MessageReplyReference" },
        text: { type: "string", maxLength: 4000 },
        updatedAt: { $ref: "#/components/schemas/DateTime" },
        sender: publicUser,
      },
    },
    MessageListResponse: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/Message" },
        },
        nextCursor: {
          allOf: [{ $ref: "#/components/schemas/ObjectId" }],
          nullable: true,
        },
      },
    },
    CreateMessageRequest: {
      type: "object",
      description: "Provide exactly one of channelId or conversationId, and text or attachments.",
      properties: {
        channelId: { $ref: "#/components/schemas/ObjectId" },
        conversationId: { $ref: "#/components/schemas/ObjectId" },
        attachments: {
          type: "array",
          maxItems: 4,
          items: { $ref: "#/components/schemas/MessageAttachment" },
        },
        pinned: { type: "boolean" },
        replyToMessageId: { $ref: "#/components/schemas/ObjectId" },
        text: { type: "string", maxLength: 4000 },
      },
    },
    MarkChatReadRequest: {
      type: "object",
      description: "Provide exactly one of channelId or conversationId.",
      properties: {
        channelId: { $ref: "#/components/schemas/ObjectId" },
        conversationId: { $ref: "#/components/schemas/ObjectId" },
      },
    },
    ToggleReactionRequest: {
      type: "object",
      required: ["emoji"],
      properties: { emoji: { type: "string", minLength: 1, maxLength: 16 } },
    },
    Notification: {
      type: "object",
      properties: {
        content: { type: "string" },
        createdAt: { $ref: "#/components/schemas/DateTime" },
        id: { $ref: "#/components/schemas/ObjectId" },
        isRead: { type: "boolean" },
        type: {
          type: "string",
          enum: ["mention", "message", "following", "reaction"],
        },
        user: {
          type: "object",
          properties: {
            avatar: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    },
    LegalContent: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["privacy", "terms", "about"] },
        title: { type: "string" },
        content: { type: "string" },
        updatedBy: { type: "string" },
        createdAt: { $ref: "#/components/schemas/DateTime" },
        updatedAt: { $ref: "#/components/schemas/DateTime" },
      },
    },
    UpsertLegalContentRequest: {
      type: "object",
      required: ["content"],
      properties: {
        title: { type: "string", minLength: 1 },
        content: { type: "string", minLength: 1 },
      },
    },
    SupportRequest: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["general_inquiry", "technical_support", "billing_question", "feedback"],
        },
        createdAt: { $ref: "#/components/schemas/DateTime" },
        email: { type: "string", format: "email" },
        fullName: { type: "string", maxLength: 160 },
        id: { $ref: "#/components/schemas/ObjectId" },
        message: { type: "string", maxLength: 4000 },
        status: { type: "string", enum: ["open"] },
        subject: { type: "string", maxLength: 200 },
        updatedAt: { $ref: "#/components/schemas/DateTime" },
      },
    },
    CreateSupportRequest: {
      type: "object",
      required: ["category", "email", "fullName", "message", "subject"],
      properties: {
        category: {
          type: "string",
          enum: ["general_inquiry", "technical_support", "billing_question", "feedback"],
        },
        email: { type: "string", format: "email" },
        fullName: { type: "string", minLength: 1, maxLength: 160 },
        message: { type: "string", minLength: 10, maxLength: 4000 },
        subject: { type: "string", minLength: 1, maxLength: 200 },
      },
    },
  },
};
