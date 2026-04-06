import type {
  ConversationDocument,
  ConversationSummary,
} from "@/modules/conversations/conversations.type.js";
import type { PublicUser } from "@/modules/users/users.type.js";

export function buildConversationParticipantKey(userIds: string[]): string {
  return [...userIds].sort().join(":");
}

export function getOtherParticipantId(
  conversation: ConversationDocument,
  currentUserId: string,
): string {
  const otherParticipantId = conversation.participantIds
    .map(participantId => String(participantId))
    .find(participantId => participantId !== currentUserId);

  if (!otherParticipantId)
    return currentUserId;

  return otherParticipantId;
}

export function toConversationSummary(input: {
  conversation: ConversationDocument;
  participant: PublicUser;
  isLocked: boolean;
  unread: number;
  lastMessage: string | null;
  lastMessageAt: Date | null;
}): ConversationSummary {
  return {
    id: input.conversation.id,
    type: "dm",
    name: input.participant.fullName,
    avatarUrl: input.participant.profile.avatarUrl,
    isEncrypted: true,
    isPinProtected: input.conversation.pinProtected,
    isLocked: input.isLocked,
    unread: input.unread,
    lastMessage: input.lastMessage,
    lastMessageAt: input.lastMessageAt,
    participant: input.participant,
  };
}
