import type { ListAdminUsersQuery, UpdateAdminUserStatusInput } from "@/modules/admin/admin.interface.js";
import type {
  AdminDashboardSummary,
  AdminUserDetail,
  AdminUserSummary,
} from "@/modules/admin/admin.type.js";

import { AdminRepository } from "@/modules/admin/admin.repository.js";
import { toPublicUser } from "@/modules/users/users.utils.js";
import { NotFoundException } from "@/utils/app-error.utils.js";

export class AdminService {
  constructor(private readonly adminRepository: AdminRepository = new AdminRepository()) {}

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const [totalUsers, blockedUsers, recentUsers] = await Promise.all([
      this.adminRepository.countUsers(),
      this.adminRepository.countUsers({ status: "blocked" }),
      this.adminRepository.findRecentUsers(),
    ]);

    return {
      totalUsers,
      blockedUsers,
      recentUsers: recentUsers.map(user => toPublicUser(user)),
    };
  }

  async listUsers(query: ListAdminUsersQuery): Promise<AdminUserSummary[]> {
    const users = await this.adminRepository.findUsers(query.search);
    return users.map(user => toPublicUser(user));
  }

  async getUserById(userId: string): Promise<AdminUserDetail> {
    const user = await this.adminRepository.findUserById(userId);
    if (!user)
      throw new NotFoundException("User not found.");

    return toPublicUser(user);
  }

  async updateUserStatus(input: UpdateAdminUserStatusInput): Promise<AdminUserDetail> {
    const user = await this.adminRepository.findUserById(input.userId);
    if (!user)
      throw new NotFoundException("User not found.");

    user.status = input.status;
    await user.save();

    return toPublicUser(user);
  }
}
