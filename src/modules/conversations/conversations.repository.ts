import { ConversationModel } from "@/modules/conversations/conversations.model.js";

export class ConversationsRepository {
  createConversation(payload: {
    participantIds: string[];
    participantKey: string;
    pinProtected: boolean;
    accessPinHash?: string;
    createdBy: string;
  }) {
    return ConversationModel.create(payload);
  }

  findById(conversationId: string) {
    return ConversationModel.findById(conversationId).exec();
  }

  findByIdWithAccessPin(conversationId: string) {
    return ConversationModel.findById(conversationId).select("+accessPinHash").exec();
  }

  findByParticipantKey(participantKey: string) {
    return ConversationModel.findOne({ participantKey }).exec();
  }

  listForUser(userId: string) {
    return ConversationModel.find({ participantIds: userId }).sort({ updatedAt: -1 }).exec();
  }

  updatePinProtection(
    conversationId: string,
    payload: { pinProtected: boolean; accessPinHash?: string },
  ) {
    return ConversationModel.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          pinProtected: payload.pinProtected,
          accessPinHash: payload.accessPinHash,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).exec();
  }

  async touchConversation(conversationId: string): Promise<void> {
    await ConversationModel.findByIdAndUpdate(
      conversationId,
      { $set: { updatedAt: new Date() } },
    ).exec();
  }
}
