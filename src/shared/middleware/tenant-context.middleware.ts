import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { TenantContext } from '../context/tenant.context';
import { ORGANIZATION_HEADER } from '../constants';
import { RequestWithOrganization } from '../types/request.types';

/**
 * Middleware that handles multi-tenant isolation via organization context.
 *
 * This middleware extracts the organization ID from request headers and sets it
 * in the TenantContext. In this application, "tenant" refers to "organization" -
 * organizations are the tenants in our multi-tenant architecture.
 *
 * The middleware:
 * 1. Extracts the organization ID from the X-Organization-Id header
 * 2. Sets it in the TenantContext for use throughout the request lifecycle
 * 3. Also attaches it to the request object for easy access in controllers
 * 4. Clears the context when the request completes
 *
 * This ensures proper multi-tenant isolation and that operations are scoped to
 * the correct organization.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  /**
   * Process the request to extract and set organization context
   * @param req Request object
   * @param res Response object
   * @param next Next function to continue middleware chain
   */
  use(req: RequestWithOrganization, res: Response, next: NextFunction) {
    this.logger.debug(`Processing request: ${req.method} ${req.path}`);
    this.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);

    // Try both lowercase and original case for the header
    const organizationIdHeader =
      req.headers[ORGANIZATION_HEADER.toLowerCase()] ||
      req.headers[ORGANIZATION_HEADER];

    this.logger.debug(`Organization ID header: ${organizationIdHeader}`);

    if (organizationIdHeader) {
      const orgId = parseInt(organizationIdHeader as string, 10);
      if (!isNaN(orgId)) {
        // Set the organization ID in both the TenantContext and the request object
        TenantContext.setCurrentTenantId(orgId);
        req.organizationId = orgId;

        this.logger.debug(`Set tenant context: ${orgId}`);
      } else {
        this.logger.warn(`Invalid organization ID: ${organizationIdHeader}`);
      }
    } else {
      this.logger.debug(
        'No organization ID found in headers, clearing tenant context',
      );
      TenantContext.clear();
    }

    // Log the current tenant ID after setting it
    this.logger.debug(
      `Current tenant ID: ${TenantContext.getCurrentTenantId()}`,
    );

    res.on('finish', () => {
      this.logger.debug('Request finished, clearing tenant context');
      TenantContext.clear();
    });

    next();
  }
}
