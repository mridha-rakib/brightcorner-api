import type { User } from "@/modules/users/users.type.js";

import { BaseRepository } from "@/common/database/base.repository.js";
import { UserModel } from "@/modules/users/users.model.js";
import { normalizeEmail, normalizeUsername } from "@/modules/users/users.utils.js";

export class UsersRepository extends BaseRepository<User> {
  constructor() {
    super(UserModel);
  }

  findById(id: string) {
    return super.findById(id);
  }

  findManyByIds(ids: string[]) {
    return this.model.find({ _id: { $in: ids } }).exec();
  }

  findByIdWithPasswordHash(id: string) {
    return this.model.findById(id).select("+passwordHash").exec();
  }

  findByIdWithTwoFactorState(id: string) {
    return this.model
      .findById(id)
      .select("+twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorLastSentAt")
      .exec();
  }

  findActiveById(id: string) {
    return this.model.findOne({ _id: id, status: "active" }).exec();
  }

  listDirectory(excludeUserId: string) {
    return this.model.find({
      status: "active",
      _id: { $ne: excludeUserId },
    }).sort({ fullName: 1 }).exec();
  }

  findByEmail(email: string, includePasswordHash = false) {
    const query = this.model.findOne({ email: normalizeEmail(email) });
    return includePasswordHash ? query.select("+passwordHash").exec() : query.exec();
  }

  findByEmailOrUsername(identifier: string, includePasswordHash = false) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const filter = normalizedIdentifier.includes("@")
      ? { email: normalizedIdentifier }
      : { "profile.username": normalizeUsername(normalizedIdentifier) };

    const query = this.model.findOne(filter);
    return includePasswordHash
      ? query.select("+passwordHash +twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorLastSentAt").exec()
      : query.exec();
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const query = this.model.exists({
      email: normalizeEmail(email),
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    });

    return Boolean(await query);
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const query = this.model.exists({
      "profile.username": normalizeUsername(username),
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    });

    return Boolean(await query);
  }

  createUser(payload: Partial<User>) {
    return this.create(payload);
  }
}
