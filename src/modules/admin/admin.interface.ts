import type { UserStatus } from "@/modules/users/users.type.js";

export type ListAdminUsersQuery = {
  search?: string;
};

export type UpdateAdminUserStatusInput = {
  userId: string;
  status: UserStatus;
};
