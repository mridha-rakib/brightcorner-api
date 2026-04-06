import type { MessageAttachment } from "@/modules/messages/messages.type.js";

export type ListMessagesInput = {
  beforeMessageId?: string;
  channelId?: string;
  conversationId?: string;
  conversationUnlockToken?: string;
  limit?: number;
  pinnedOnly?: boolean;
};

export type CreateMessageInput = {
  attachments?: MessageAttachment[];
  channelId?: string;
  conversationId?: string;
  conversationUnlockToken?: string;
  pinned?: boolean;
  replyToMessageId?: string;
  text?: string;
};

export type ToggleMessageReactionInput = {
  conversationUnlockToken?: string;
  emoji: string;
  messageId: string;
};

export type MarkChatReadInput = {
  channelId?: string;
  conversationId?: string;
  conversationUnlockToken?: string;
};
