import type { NotificationType } from "@/modules/notifications/notifications.type.js";

import { NotificationModel } from "@/modules/notifications/notifications.model.js";

export class NotificationsRepository {
  createMany(payloads: Array<{
    actorAvatarUrl?: string;
    actorName: string;
    chatId?: string;
    chatType?: "channel" | "conversation";
    content: string;
    type: NotificationType;
    userId: string;
  }>) {
    if (payloads.length === 0)
      return Promise.resolve([]);

    return NotificationModel.insertMany(payloads, { ordered: false });
  }

  listForUser(userId: string, limit = 50) {
    return NotificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await NotificationModel.updateMany(
      {
        userId,
        readAt: null,
      },
      {
        $set: {
          readAt: new Date(),
        },
      },
    ).exec();
  }
}
