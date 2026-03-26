import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import {
  adminUpdateUserStatusSchema,
  adminUserParamsSchema,
  adminUsersQuerySchema,
} from "@/modules/admin/admin.schema.js";
import { AdminService } from "@/modules/admin/admin.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

export class AdminController {
  constructor(private readonly adminService: AdminService = new AdminService()) {}

  readonly getDashboardSummary = async (
    _req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const summary = await this.adminService.getDashboardSummary();
    ApiResponse.success(res, summary, "Dashboard summary fetched successfully.");
  };

  readonly listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(adminUsersQuerySchema, req);
    const users = await this.adminService.listUsers(payload.query);
    ApiResponse.success(res, users, "Admin users fetched successfully.");
  };

  readonly getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(adminUserParamsSchema, req);
    const user = await this.adminService.getUserById(payload.params.userId);
    ApiResponse.success(res, user, "Admin user fetched successfully.");
  };

  readonly updateUserStatus = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const payload = await zParse(adminUpdateUserStatusSchema, req);
    const user = await this.adminService.updateUserStatus({
      userId: payload.params.userId,
      status: payload.body.status,
    });
    ApiResponse.success(res, user, "User status updated successfully.");
  };
}
