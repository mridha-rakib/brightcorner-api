import { UserModel } from "@/modules/users/users.model.js";

export class AdminRepository {
  countUsers(filter: Record<string, unknown> = {}) {
    return UserModel.countDocuments(filter).exec();
  }

  findRecentUsers(limit = 5) {
    return UserModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  findUsers(search?: string) {
    const normalizedSearch = search?.trim();
    const filter = normalizedSearch
      ? {
          $or: [
            { fullName: { $regex: normalizedSearch, $options: "i" } },
            { email: { $regex: normalizedSearch, $options: "i" } },
            { "profile.username": { $regex: normalizedSearch, $options: "i" } },
          ],
        }
      : {};

    return UserModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  findUserById(userId: string) {
    return UserModel.findById(userId).exec();
  }
}
