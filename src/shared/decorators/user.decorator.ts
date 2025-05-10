import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';

/**
 * Get the authenticated user from the request
 * @param data - Optional data to extract specific user properties
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as User;

    return data ? user?.[data] : user;
  },
);
