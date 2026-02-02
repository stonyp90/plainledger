/**
 * CurrentUser Decorator
 * 
 * Extracts the current user from the request context.
 * Works with Keycloak authentication.
 */

import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface UserPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  organizationId?: string;
  roles?: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext): UserPayload | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
