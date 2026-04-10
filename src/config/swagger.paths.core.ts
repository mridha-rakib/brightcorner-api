import {
  body,
  emptyResponse,
  errors,
  nullData,
  objectIdParam,
  publicUser,
  publicUsers,
  response,
  searchParam,
  secured,
} from "@/config/swagger.helpers.js";

export const coreSwaggerPaths = {
  "/": {
    get: {
      tags: ["Root"],
      summary: "API root",
      responses: {
        ...response("API metadata", {
          type: "object",
          properties: { service: { type: "string", example: "Bright Corner API" } },
        }),
        ...errors(429, 500),
      },
    },
  },
  "/health": {
    get: {
      tags: ["Root"],
      summary: "Health check",
      responses: {
        ...response("Service is healthy", {
          type: "object",
          properties: { status: { type: "string", example: "ok" } },
        }),
        ...errors(429, 500),
      },
    },
  },
  "/auth/sign-up": {
    post: {
      tags: ["Auth"],
      summary: "Create an account",
      requestBody: body("#/components/schemas/SignUpRequest"),
      responses: {
        ...response("Account created", publicUser, 201),
        ...errors(400, 409, 413, 429, 500),
      },
    },
  },
  "/auth/sign-in": {
    post: {
      tags: ["Auth"],
      summary: "Sign in",
      requestBody: body("#/components/schemas/SignInRequest"),
      responses: {
        ...response("Signed in or 2FA challenge issued", {
          $ref: "#/components/schemas/SignInData",
        }),
        ...errors(400, 401, 403, 413, 429, 500),
      },
    },
  },
  "/auth/two-factor/resend": {
    post: {
      tags: ["Auth"],
      summary: "Resend sign-in two-factor code",
      requestBody: body("#/components/schemas/ChallengeTokenRequest"),
      responses: {
        ...response("Verification code sent", {
          $ref: "#/components/schemas/TwoFactorChallenge",
        }),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
  "/auth/two-factor/verify": {
    post: {
      tags: ["Auth"],
      summary: "Verify sign-in two-factor code",
      requestBody: body("#/components/schemas/VerifySignInTwoFactorRequest"),
      responses: {
        ...response("Signed in", publicUser),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Refresh the current session",
      security: [{ refreshCookie: [] }],
      responses: {
        ...response("Session refreshed", publicUser),
        ...errors(401, 404, 429, 500),
      },
    },
  },
  "/auth/sign-out": {
    post: {
      tags: ["Auth"],
      summary: "Sign out",
      security: [{ refreshCookie: [] }],
      responses: {
        ...response("Signed out", nullData),
        ...errors(429, 500),
      },
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request a password reset",
      requestBody: body("#/components/schemas/ForgotPasswordRequest"),
      responses: {
        ...response("Password reset message handled", nullData),
        ...errors(400, 413, 429, 500),
      },
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password",
      requestBody: body("#/components/schemas/ResetPasswordRequest"),
      responses: {
        ...response("Password reset", nullData),
        ...errors(400, 404, 413, 429, 500),
      },
    },
  },
  "/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Get the authenticated user",
      security: secured,
      responses: {
        ...response("Current user fetched", publicUser),
        ...errors(401, 404, 429, 500),
      },
    },
  },
  "/users/directory": {
    get: {
      tags: ["Users"],
      summary: "List users in the directory",
      security: secured,
      parameters: [searchParam],
      responses: {
        ...response("User directory fetched", publicUsers),
        ...errors(400, 401, 429, 500),
      },
    },
  },
  "/users/me": {
    get: {
      tags: ["Users"],
      summary: "Get my user profile",
      security: secured,
      responses: {
        ...response("Current user fetched", publicUser),
        ...errors(401, 404, 429, 500),
      },
    },
    delete: {
      tags: ["Users"],
      summary: "Delete my account",
      security: secured,
      requestBody: body("#/components/schemas/DeleteAccountRequest"),
      responses: {
        ...emptyResponse("Account deleted"),
        ...errors(400, 401, 404, 413, 429, 500),
      },
    },
  },
  "/users/me/onboarding": {
    patch: {
      tags: ["Users"],
      summary: "Complete onboarding",
      security: secured,
      requestBody: body("#/components/schemas/OnboardingRequest"),
      responses: {
        ...response("Onboarding completed", publicUser),
        ...errors(400, 401, 409, 413, 429, 500),
      },
    },
  },
  "/users/me/profile": {
    patch: {
      tags: ["Users"],
      summary: "Update my profile",
      security: secured,
      requestBody: body("#/components/schemas/ProfileUpdateRequest"),
      responses: {
        ...response("Profile updated", publicUser),
        ...errors(400, 401, 409, 413, 429, 500),
      },
    },
  },
  "/users/me/privacy-settings": {
    patch: {
      tags: ["Users"],
      summary: "Update my privacy settings",
      security: secured,
      requestBody: body("#/components/schemas/UserPrivacySettings"),
      responses: {
        ...response("Privacy settings updated", publicUser),
        ...errors(400, 401, 413, 429, 500),
      },
    },
  },
  "/users/me/notification-settings": {
    patch: {
      tags: ["Users"],
      summary: "Update my notification settings",
      security: secured,
      requestBody: body("#/components/schemas/UserNotificationSettings"),
      responses: {
        ...response("Notification settings updated", publicUser),
        ...errors(400, 401, 413, 429, 500),
      },
    },
  },
  "/users/me/change-email": {
    patch: {
      tags: ["Users"],
      summary: "Change my email address",
      security: secured,
      requestBody: body("#/components/schemas/ChangeEmailRequest"),
      responses: {
        ...response("Email updated", publicUser),
        ...errors(400, 401, 409, 413, 429, 500),
      },
    },
  },
  "/users/me/change-password": {
    patch: {
      tags: ["Users"],
      summary: "Change my password",
      security: secured,
      requestBody: body("#/components/schemas/ChangePasswordRequest"),
      responses: {
        ...response("Password updated", nullData),
        ...errors(400, 401, 404, 413, 429, 500),
      },
    },
  },
  "/users/me/two-factor": {
    get: {
      tags: ["Users"],
      summary: "Get my two-factor settings",
      security: secured,
      responses: {
        ...response("Two-factor settings fetched", {
          $ref: "#/components/schemas/TwoFactorSettings",
        }),
        ...errors(401, 404, 429, 500),
      },
    },
  },
  "/users/me/two-factor/send-code": {
    post: {
      tags: ["Users"],
      summary: "Send a two-factor setup code",
      security: secured,
      responses: {
        ...response("Verification code sent", {
          $ref: "#/components/schemas/TwoFactorSettings",
        }),
        ...errors(400, 401, 404, 429, 500),
      },
    },
  },
  "/users/me/two-factor/verify": {
    post: {
      tags: ["Users"],
      summary: "Enable or disable two-factor authentication",
      security: secured,
      requestBody: body("#/components/schemas/VerifyTwoFactorRequest"),
      responses: {
        ...response("Two-factor settings updated", publicUser),
        ...errors(400, 401, 404, 413, 429, 500),
      },
    },
  },
  "/admin/dashboard": {
    get: {
      tags: ["Admin"],
      summary: "Get dashboard summary",
      security: secured,
      responses: {
        ...response("Dashboard summary fetched", {
          $ref: "#/components/schemas/AdminDashboardSummary",
        }),
        ...errors(401, 403, 429, 500),
      },
    },
  },
  "/admin/users": {
    get: {
      tags: ["Admin"],
      summary: "List users",
      security: secured,
      parameters: [searchParam],
      responses: {
        ...response("Admin users fetched", publicUsers),
        ...errors(400, 401, 403, 429, 500),
      },
    },
  },
  "/admin/users/{userId}": {
    get: {
      tags: ["Admin"],
      summary: "Get a user by ID",
      security: secured,
      parameters: [objectIdParam("userId", "User ID")],
      responses: {
        ...response("Admin user fetched", publicUser),
        ...errors(400, 401, 403, 404, 429, 500),
      },
    },
  },
  "/admin/users/{userId}/status": {
    patch: {
      tags: ["Admin"],
      summary: "Update a user's status",
      security: secured,
      parameters: [objectIdParam("userId", "User ID")],
      requestBody: body("#/components/schemas/AdminUpdateUserStatusRequest"),
      responses: {
        ...response("User status updated", publicUser),
        ...errors(400, 401, 403, 404, 413, 429, 500),
      },
    },
  },
};
