import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import { createSupportRequestSchema } from "@/modules/support-requests/support-requests.schema.js";
import { SupportRequestsService } from "@/modules/support-requests/support-requests.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

export class SupportRequestsController {
  constructor(
    private readonly supportRequestsService: SupportRequestsService = new SupportRequestsService(),
  ) {}

  readonly create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(createSupportRequestSchema, req);
    const request = await this.supportRequestsService.createSupportRequest(req.user!.id, payload.body);
    ApiResponse.created(res, request, "Support request submitted successfully.");
  };
}
