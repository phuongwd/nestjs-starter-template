import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AUTH_ERROR_MESSAGES } from '../constants/auth.constant';
import { Observable } from 'rxjs';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

interface JwtError {
  name: string;
  message: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Handles the authentication process
   * @param context - The execution context
   * @returns The authentication result
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * Handles authentication errors
   * @param error - The error that occurred during authentication
   * @param user - The authenticated user if successful
   * @param info - Additional error information
   * @returns The authenticated user
   * @throws UnauthorizedException if authentication fails
   */
  handleRequest<TUser>(
    error: Error | null,
    user: TUser | false,
    info: JwtError | null,
  ): TUser {
    if (error || !user) {
      if (info?.name === TokenExpiredError.name) {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.TOKEN_EXPIRED);
      }
      if (info?.name === JsonWebTokenError.name) {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
    }
    return user as TUser;
  }
}
