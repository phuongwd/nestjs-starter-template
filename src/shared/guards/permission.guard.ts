import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequiredPermission } from '../types/permission.types';
import { User } from '@prisma/client';
import { PermissionCheckerService } from '../services/permission-checker.service';
import { TenantContext } from '../context/tenant.context';
import { RequestWithUserAndOrganization } from '../types/request.types';

/**
 * Guard that checks if the user has the required permissions for a route
 * Integrates with the organization context to enforce multi-tenant permissions
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionChecker: PermissionCheckerService,
  ) {}

  /**
   * Validate if the current user can activate the target endpoint
   * based on their permissions within the organization context
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is public (no permissions needed)
    if (this.isPublicRoute(context)) {
      return true;
    }

    // Get permissions required for this route
    const requiredPermissions = this.getRequiredPermissions(context);
    if (!requiredPermissions?.length) {
      return true; // No permissions required
    }

    // Get request and user information
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserAndOrganization>();
    const user = request.user;
    const path = request.path;
    const method = request.method;

    this.logRequestDetails(request, requiredPermissions);

    // Handle special cases
    if (this.isOrganizationListEndpoint(path, method, requiredPermissions)) {
      return true;
    }

    if (this.isOrganizationCreation(path, method, requiredPermissions)) {
      return true;
    }

    if (this.isProjectOperation(path, requiredPermissions)) {
      if (this.isDevelopment) {
        this.logger.debug(
          'Bypassing permission checks for project operations in development mode',
          { userId: user.id, path },
        );
        return true;
      }

      // Check project permissions using header organization ID
      const projectResult = await this.handleProjectOperations(
        request,
        user,
        requiredPermissions,
      );
      if (projectResult) {
        return true;
      }
    }

    // Standard permission check flow
    const organizationId = this.getOrganizationId(request);

    this.logger.debug('Organization ID from request', {
      organizationId,
      path,
      method,
      tenantId: TenantContext.getCurrentTenantId(),
      requestOrgId: request.organizationId,
    });

    // Handle global operations (no specific organization)
    if (!organizationId) {
      if (this.isGlobalListOperation(requiredPermissions)) {
        this.logger.debug('Processing global list operation');
        return true; // Filtering happens at service layer
      }

      throw new ForbiddenException(
        'Organization ID is required for this operation',
      );
    }

    // Check permissions against the resolved organization ID
    const hasPermission = await this.permissionChecker.hasPermissions(
      user.id,
      organizationId,
      requiredPermissions,
    );

    if (!hasPermission) {
      this.logPermissionDenied(
        user.id,
        organizationId,
        requiredPermissions,
        path,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Check if route is marked as public
   */
  private isPublicRoute(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic === true;
  }

  /**
   * Get required permissions for this route
   */
  private getRequiredPermissions(
    context: ExecutionContext,
  ): RequiredPermission[] {
    return (
      this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || []
    );
  }

  /**
   * Log detailed request information for debugging
   */
  private logRequestDetails(
    request: RequestWithUserAndOrganization,
    requiredPermissions: RequiredPermission[],
  ): void {
    const user = request.user;
    const requestId = request.headers['x-request-id'];
    const path = request.path;
    const method = request.method;

    this.logger.debug(`Processing ${method} request for path: ${path}`, {
      userId: user.id,
      requiredPermissions,
      requestId: requestId ? String(requestId) : undefined,
      headers: {
        'x-organization-id': request.headers['x-organization-id'],
      },
    });
  }

  /**
   * Check if this is an organizations list endpoint
   */
  private isOrganizationListEndpoint(
    path: string,
    method: string,
    requiredPermissions: RequiredPermission[],
  ): boolean {
    const pathMatch =
      path.endsWith('/organizations') ||
      !!path.match(/\/api\/v\d+\/organizations$/);

    return (
      pathMatch &&
      method === 'GET' &&
      requiredPermissions.some(
        (p) => p.resource === 'organizations' && p.action === 'read',
      )
    );
  }

  /**
   * Check if this is an organization creation endpoint
   */
  private isOrganizationCreation(
    path: string,
    method: string,
    requiredPermissions: RequiredPermission[],
  ): boolean {
    const pathMatch =
      path.endsWith('/organizations') ||
      !!path.match(/\/api\/v\d+\/organizations$/);

    return (
      method === 'POST' &&
      pathMatch &&
      requiredPermissions.some(
        (p) => p.action === 'create' && p.resource === 'organization',
      )
    );
  }

  /**
   * Check if this is a project operation
   */
  private isProjectOperation(
    path: string,
    requiredPermissions: RequiredPermission[],
  ): boolean {
    return (
      path.includes('/projects') &&
      requiredPermissions.some((p) => p.resource === 'project')
    );
  }

  /**
   * Handle project-specific permission checks
   */
  private async handleProjectOperations(
    request: RequestWithUserAndOrganization,
    user: User,
    requiredPermissions: RequiredPermission[],
  ): Promise<boolean> {
    // Extract organization ID from headers
    const orgIdHeader = request.headers['x-organization-id'];
    if (!orgIdHeader) {
      return false;
    }

    const orgId = Number(orgIdHeader);
    if (isNaN(orgId)) {
      return false;
    }

    this.logger.debug(`Using organization ID from header: ${orgId}`);

    // Check if user has required permissions for this organization
    const hasPermission = await this.permissionChecker.hasPermissions(
      user.id,
      orgId,
      requiredPermissions,
    );

    if (!hasPermission) {
      this.logPermissionDenied(
        user.id,
        orgId,
        requiredPermissions,
        request.path,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Check if this is a global list operation
   */
  private isGlobalListOperation(
    requiredPermissions: RequiredPermission[],
  ): boolean {
    return requiredPermissions.every(
      (p) =>
        p.action === 'read' &&
        (p.resource === 'organization' || p.resource === 'organizations'),
    );
  }

  /**
   * Log permission denied
   */
  private logPermissionDenied(
    userId: number,
    organizationId: number,
    requiredPermissions: RequiredPermission[],
    path: string,
  ): void {
    this.logger.warn('Permission denied', {
      userId,
      organizationId,
      requiredPermissions,
      path,
    });
  }

  /**
   * Get organization ID from request parameters
   * Checks multiple sources in order of precedence
   */
  private getOrganizationId(
    request: RequestWithUserAndOrganization,
  ): number | undefined {
    // Try to get organizationId directly from the request object (set by middleware)
    if (request.organizationId) {
      return request.organizationId;
    }

    // Try to get organizationId from route params
    const paramOrgId = request.params?.organizationId;
    if (paramOrgId && !isNaN(Number(paramOrgId))) {
      return Number(paramOrgId);
    }

    // Try to get organizationId from request body
    const bodyOrgId =
      request.body && typeof request.body === 'object'
        ? (request.body as Record<string, unknown>).organizationId
        : undefined;
    if (bodyOrgId && !isNaN(Number(bodyOrgId))) {
      return Number(bodyOrgId);
    }

    // Try to get organizationId from query params
    const queryOrgId = request.query?.organizationId;
    if (queryOrgId && !isNaN(Number(queryOrgId))) {
      return Number(queryOrgId);
    }

    // Try to get organizationId from tenant context
    const tenantId = TenantContext.getCurrentTenantId();
    if (tenantId) {
      return tenantId;
    }

    // Try to get organizationId from headers directly
    const orgIdHeader = request.headers['x-organization-id'];
    if (orgIdHeader && !isNaN(Number(orgIdHeader))) {
      return Number(orgIdHeader);
    }

    return undefined;
  }
}
