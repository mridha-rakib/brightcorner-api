import type { MessageAttachment } from "@/modules/messages/messages.type.js";

export type ListMessagesInput = {
  beforeMessageId?: string;
  channelId?: string;
  conversationId?: string;
  limit?: number;
  pinnedOnly?: boolean;
};

export type CreateMessageInput = {
  attachments?: MessageAttachment[];
  channelId?: string;
  conversationId?: string;
  pinned?: boolean;
  replyToMessageId?: string;
  text?: string;
};

export type ToggleMessageReactionInput = {
  emoji: string;
  messageId: string;
};

export type MarkChatReadInput = {
  channelId?: string;
  conversationId?: string;
};
