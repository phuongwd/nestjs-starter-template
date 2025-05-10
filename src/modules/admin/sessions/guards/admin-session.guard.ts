import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AdminSessionService } from '../services/admin-session.service';
import { RequestWithUser } from '@/modules/auth/types/user.types';

type RequestWithCookies = RequestWithUser & {
  cookies: { [key: string]: string | undefined };
};

/**
 * Guard to validate admin sessions
 * Ensures the admin has a valid session before accessing protected routes
 *
 * Usage:
 * ```typescript
 * @UseGuards(AdminSessionGuard)
 * export class AdminController {
 *   // Protected routes requiring valid admin session
 * }
 * ```
 *
 * The guard will:
 * 1. Extract session token from request headers or cookies
 * 2. Validate the session using AdminSessionService
 * 3. Attach validated session to request object
 * 4. Allow/deny access based on session validity
 */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  private readonly logger = new Logger(AdminSessionGuard.name);

  constructor(private readonly sessionService: AdminSessionService) {}

  /**
   * Validates the admin session for the incoming request
   * @param context - The execution context containing the request
   * @returns Promise resolving to boolean indicating if access is allowed
   * @throws UnauthorizedException if session is invalid or missing
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<RequestWithCookies>();
      const sessionToken = this.extractSessionToken(request);

      if (!sessionToken) {
        throw new UnauthorizedException('Admin session token not found');
      }

      // Validate the session
      const session = await this.sessionService.validateSession(sessionToken);

      // Attach session to request for use in handlers
      request.adminSession = session;

      return true;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Session validation failed: ${error.message}`);

      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException('Invalid admin session');
    }
  }

  /**
   * Extracts session token from request
   * Checks multiple locations in the following order:
   * 1. Authorization header with 'Session' prefix
   * 2. Custom x-admin-session header
   * 3. adminSession cookie
   *
   * @param request - The incoming request object
   * @returns The session token if found, undefined otherwise
   */
  private extractSessionToken(request: RequestWithCookies): string | undefined {
    // Try to get from Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Session ')) {
      return authHeader.substring(8);
    }

    // Try to get from custom header
    const sessionHeader = request.headers['x-admin-session'];
    if (sessionHeader) {
      return Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;
    }

    // Try to get from cookies
    if (request.cookies && 'adminSession' in request.cookies) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return request?.cookies?.adminSession;
    }
    return undefined;
  }
}
