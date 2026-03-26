import type { Response } from "express";

import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import {
  legalContentParamsSchema,
  upsertLegalContentSchema,
} from "@/modules/legal-content/legal-content.schema.js";
import { LegalContentService } from "@/modules/legal-content/legal-content.service.js";
import { ApiResponse } from "@/utils/response.utils.js";
import { zParse } from "@/utils/validators.utils.js";

export class LegalContentController {
  constructor(
    private readonly legalContentService: LegalContentService = new LegalContentService(),
  ) {}

  readonly getByType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(legalContentParamsSchema, req);
    const content = await this.legalContentService.getByType(payload.params.type);
    ApiResponse.success(res, content, "Legal content fetched successfully.");
  };

  readonly upsert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payload = await zParse(upsertLegalContentSchema, req);
    const content = await this.legalContentService.upsert({
      type: payload.params.type,
      title: payload.body.title,
      content: payload.body.content,
      updatedBy: req.user!.id,
    });

    ApiResponse.success(res, content, "Legal content updated successfully.");
  };
}
