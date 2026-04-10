export type ListConversationsInput = {
  conversationUnlockToken?: string;
  search?: string;
};

export type CreateDirectConversationInput = {
  participantUserId: string;
  pin?: string;
};

export type UnlockProtectedConversationInput = {
  pin: string;
};
