import type { NextFunction, Request, Response } from "express";

import { AUTH_CONSTANTS } from "@/common/auth/auth.constants.js";
import { TokenService } from "@/common/auth/token.service.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { UnauthorizedException } from "@/utils/app-error.utils.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role?: string;
  sessionId: string;
};

export type AuthenticatedRequest = {
  user?: AuthenticatedUser;
} & Request;

export type AuthResolver = {
  resolve: (request: Request) => Promise<AuthenticatedUser | undefined>;
};

export class NoopAuthResolver implements AuthResolver {
  async resolve(_request: Request): Promise<AuthenticatedUser | undefined> {
    return undefined;
  }
}

export class JwtAuthResolver implements AuthResolver {
  constructor(
    private readonly tokenService: TokenService = new TokenService(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
  ) {}

  async resolve(request: Request): Promise<AuthenticatedUser | undefined> {
    const accessToken = this.extractAccessToken(request);
    if (!accessToken)
      return undefined;

    try {
      const payload = this.tokenService.verifyAccessToken(accessToken);
      const user = await this.usersRepository.findActiveById(payload.sub);
      if (!user)
        return undefined;

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: payload.sessionId,
      };
    }
    catch {
      return undefined;
    }
  }

  private extractAccessToken(request: Request): string | undefined {
    const cookieToken = request.cookies?.[AUTH_CONSTANTS.ACCESS_TOKEN_COOKIE_NAME];
    if (typeof cookieToken === "string" && cookieToken.length > 0)
      return cookieToken;

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer "))
      return undefined;

    const [, token] = authorization.split(" ");
    return token;
  }
}

export class AuthMiddleware {
  constructor(
    private readonly resolver: AuthResolver = new NoopAuthResolver(),
    private readonly required = false,
  ) {}

  public handle = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await this.resolver.resolve(req);

      if (!user && this.required) {
        next(new UnauthorizedException("Authentication required"));
        return;
      }

      req.user = user;
      next();
    }
    catch (error) {
      next(error);
    }
  };
}

const defaultAuthResolver = new JwtAuthResolver();

export const optionalAuth = new AuthMiddleware(defaultAuthResolver).handle;
export const requiredAuth = new AuthMiddleware(defaultAuthResolver, true).handle;
