export type ListMessagesInput = {
  channelId?: string;
  conversationId?: string;
  pinnedOnly?: boolean;
};

export type CreateMessageInput = {
  channelId?: string;
  conversationId?: string;
  text: string;
  pinned?: boolean;
};
