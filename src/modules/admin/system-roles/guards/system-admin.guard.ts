import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRoleService } from '../services/system-role.service';
import { RequestWithUser } from '@/modules/auth/types/user.types';

/**
 * Guard to protect system admin endpoints
 * Ensures the user has appropriate system role permissions
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  private readonly logger = new Logger(SystemAdminGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly systemRoleService: SystemRoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const user = request.user;

      if (!user?.id) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Check if user has SYSTEM_ADMIN role first
      const isSystemAdmin = await this.systemRoleService.hasSystemRole(
        user.id,
        'SYSTEM_ADMIN',
      );

      if (isSystemAdmin) {
        return true;
      }

      // For non-system admins, check specific roles
      const requiredRole = this.reflector.get<string>(
        'systemRole',
        context.getHandler(),
      );

      if (!requiredRole) {
        this.logger.warn(
          `No system role requirement specified for ${context.getClass().name}.${
            context.getHandler().name
          }`,
        );
        return false;
      }

      const hasRole = await this.systemRoleService.hasSystemRole(
        user.id,
        requiredRole,
      );

      if (!hasRole) {
        throw new ForbiddenException(
          `Access denied. Required system role: ${requiredRole}`,
        );
      }

      return true;
    } catch (err: unknown) {
      // Handle known exceptions
      if (
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }

      // Convert unknown error to Error type
      const error = err instanceof Error ? err : new Error(String(err));

      this.logger.error(
        `Error checking system role permissions: ${error.message}`,
        error.stack,
      );

      throw new ForbiddenException('Error checking system role permissions');
    }
  }
}
