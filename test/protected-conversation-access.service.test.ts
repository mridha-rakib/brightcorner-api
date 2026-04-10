import { describe, expect, it } from "vitest";

import { ProtectedConversationAccessService } from "../src/modules/conversations/protected-conversation-access.service.js";

describe("ProtectedConversationAccessService", () => {
  it("keeps unlock tokens independent for each participant", () => {
    const service = new ProtectedConversationAccessService();
    const conversationId = "conversation-shared-pin";
    const firstUserId = "user-one";
    const secondUserId = "user-two";

    const firstUserToken = service.issueAccessToken({
      conversationId,
      userId: firstUserId,
    });
    const secondUserToken = service.issueAccessToken({
      conversationId,
      userId: secondUserId,
    });

    expect(service.validateAccessToken({
      conversationId,
      token: firstUserToken,
      userId: firstUserId,
    })).toBe(true);
    expect(service.validateAccessToken({
      conversationId,
      token: secondUserToken,
      userId: secondUserId,
    })).toBe(true);

    service.revokeAccessToken(firstUserToken);

    expect(service.validateAccessToken({
      conversationId,
      token: firstUserToken,
      userId: firstUserId,
    })).toBe(false);
    expect(service.validateAccessToken({
      conversationId,
      token: secondUserToken,
      userId: secondUserId,
    })).toBe(true);
  });
});
