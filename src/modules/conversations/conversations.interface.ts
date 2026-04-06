export type ListConversationsInput = {
  search?: string;
};

export type CreateDirectConversationInput = {
  participantUserId: string;
  pin?: string;
};

export type UnlockProtectedConversationInput = {
  pin: string;
};
