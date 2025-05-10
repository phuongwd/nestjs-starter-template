import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAccessTokenService } from '../interfaces/service.interface';
import { ACCESS_TOKEN_INJECTION_TOKENS } from '../constants/injection-tokens';

/**
 * Metadata key for required token scopes
 */
export const REQUIRED_SCOPES = 'required_scopes';

/**
 * Decorator for setting required scopes on a route
 * @param scopes The scopes required to access the route
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES, scopes);

/**
 * Guard that protects routes with API token authentication
 * Uses the Authorization header with Bearer scheme
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_INJECTION_TOKENS.SERVICE.ACCESS_TOKEN)
    private readonly accessTokenService: IAccessTokenService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Validate the request for access token authentication
   * @param context The execution context
   * @returns true if the request is authenticated, false otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    // Get required scopes from route metadata
    const requiredScopes = this.reflector.get<string[]>(
      REQUIRED_SCOPES,
      context.getHandler(),
    );

    try {
      // Validate the token and get the associated user ID
      const userId = await this.accessTokenService.validateToken(
        token,
        requiredScopes,
      );

      // Attach the user ID to the request for use in controllers
      request.user = { id: userId };
      return true;
    } catch (error: unknown) {
      // Handle error with proper typing
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid access token';

      throw new UnauthorizedException(errorMessage);
    }
  }
}
