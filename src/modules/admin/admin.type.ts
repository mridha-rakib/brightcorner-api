import type { PublicUser } from "@/modules/users/users.type.js";

export type AdminDashboardSummary = {
  totalUsers: number;
  blockedUsers: number;
  recentUsers: PublicUser[];
};

export type AdminUserSummary = PublicUser;
export type AdminUserDetail = PublicUser;
