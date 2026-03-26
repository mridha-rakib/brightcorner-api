import type { NextFunction, Response } from "express";

import type { AuthRole } from "@/common/auth/auth.types.js";
import type { AuthenticatedRequest } from "@/middlewares/auth.middleware.js";

import { ForbiddenException } from "@/utils/app-error.utils.js";

export function authorizeRoles(...roles: AuthRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role as AuthRole)) {
      next(new ForbiddenException("You do not have access to this resource."));
      return;
    }

    next();
  };
}
