import { Request } from 'express';
import { ORGANIZATION_HEADER } from '../constants';
import { User } from '@prisma/client';

/**
 * Extends the Express Request interface to include organization context
 *
 * This interface is used throughout the application for requests that need
 * access to the current organization ID, which is set by the TenantContextMiddleware.
 * It provides a standardized way to access the organization context in controllers
 * and other request handlers.
 */
export interface RequestWithOrganization extends Request {
  /**
   * The current organization ID extracted from request headers or context
   * Set by TenantContextMiddleware from the X-Organization-Id header
   */
  organizationId?: number;
}

/**
 * Extends the Express Request interface to include authenticated user information
 *
 * This interface is used throughout the application for authenticated requests
 * that need access to the current user's information, which is set by JwtAuthGuard
 * or other authentication guards.
 *
 * This provides a standardized way to access the authenticated user in controllers
 * without needing to redefine the interface in each file.
 */
export interface RequestWithUser extends Request {
  /**
   * The authenticated user object
   * In auth contexts may include additional properties like isSystemAdmin
   */
  user: User;
}

/**
 * Combines organization context and user authentication in a single request type
 *
 * This interface is used for routes that require both organization context
 * and user authentication, such as organization-specific operations performed
 * by authenticated users.
 */
export interface RequestWithUserAndOrganization extends Request {
  /**
   * The authenticated user object containing user information
   * Set by authentication guards from the JWT token payload
   */
  user: User;

  /**
   * The current organization ID extracted from request headers or context
   * Set by TenantContextMiddleware from the X-Organization-Id header
   */
  organizationId?: number;
}

/**
 * Extends the Express Request interface to include both organization context
 * and the header key directly as a property (used in some middleware)
 */
export interface RequestWithOrganizationHeader extends Request {
  /**
   * Organization ID provided in the header
   * Used in some middleware components that need direct access to the header value
   */
  [ORGANIZATION_HEADER]?: number;
}
