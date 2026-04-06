import type { MessageAttachment } from "@/modules/messages/messages.type.js";

export type ListMessagesInput = {
  channelId?: string;
  conversationId?: string;
  pinnedOnly?: boolean;
};

export type CreateMessageInput = {
  attachments?: MessageAttachment[];
  channelId?: string;
  conversationId?: string;
  pinned?: boolean;
  text?: string;
};
