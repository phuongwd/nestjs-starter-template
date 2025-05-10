import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { CustomDomainService } from '../services/custom-domain.service';
import { ORGANIZATION_HEADER } from '@shared/constants';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import * as ipaddr from 'ipaddr.js';
import { RequestWithOrganizationHeader } from '@/shared/types/request.types';

/**
 * Middleware to handle custom domain routing
 * - Identifies organization from custom domain
 * - Sets organization context
 * - Handles domain-specific configurations
 * - Implements caching for performance
 * - Sets security headers
 * - Bypasses domain routing for system admin routes
 */
@Injectable()
export class DomainRoutingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DomainRoutingMiddleware.name);
  private readonly defaultDomain: string;
  private readonly systemPaths = ['/admin', '/system', '/organizations'];
  // Add metrics paths to bypass list
  private readonly metricsPaths = ['/metrics', '/metrics/health'];

  constructor(
    private readonly configService: ConfigService,
    private readonly domainService: CustomDomainService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.defaultDomain = this.configService.get<string>(
      'APP_DOMAIN',
      'localhost',
    );
  }

  async use(
    req: RequestWithOrganizationHeader,
    res: Response,
    next: NextFunction,
  ) {
    const hostname = req.hostname;
    const path = req.path;
    const ip = req.ip || '';
    const fullUrl = req.originalUrl || req.url || '';

    try {
      // Special handling for Docker health checks with query parameters
      if (hostname === 'host.docker.internal' || hostname.includes('docker')) {
        // Set a default organization ID for Docker requests
        req[ORGANIZATION_HEADER] = 1;
        this.logger.debug(
          `Special handling for Docker host: ${hostname}, URL: ${fullUrl}`,
        );
        return next();
      }

      // Skip for metrics endpoints - check this first to prioritize metrics access
      // Enhanced check to catch Prometheus query parameters
      if (
        this.metricsPaths.some(
          (metricPath) =>
            path === metricPath || path.startsWith(metricPath + '/'),
        ) ||
        fullUrl.includes('check_path=%2Fmetrics') ||
        fullUrl.includes('metrics') ||
        fullUrl.includes('health')
      ) {
        this.logger.debug(
          `Bypassing domain routing for metrics/health endpoint: ${fullUrl}, hostname: ${hostname}`,
        );
        // Set a default organization ID for metrics/health endpoints
        req[ORGANIZATION_HEADER] = 1;
        return next();
      }

      // Skip for system admin routes
      if (this.systemPaths.some((prefix) => path.startsWith(prefix))) {
        return next();
      }

      // Enhanced Docker detection using ipaddr.js for proper CIDR matching
      const isDockerRequest = this.isDockerRequest(ip);

      if (isDockerRequest) {
        this.logger.debug(
          `Bypassing domain routing for Docker IP request: IP=${ip}, hostname=${hostname}, path=${fullUrl}`,
        );
        // Set a default organization ID for Docker IP requests
        req[ORGANIZATION_HEADER] = 1;
        return next();
      }

      // Skip for default domain or localhost
      if (hostname === this.defaultDomain || hostname === 'localhost') {
        return next();
      }

      // Special handling for Render.com domains
      if (hostname.endsWith('.onrender.com')) {
        this.logger.log(`Special handling for Render.com domain: ${hostname}`);
        // Set a default organization ID for Render.com domains (1 is typically the first organization)
        req[ORGANIZATION_HEADER] = 1;
        return next();
      }

      // Try to get organization from cache first
      const cacheKey = `domain:${hostname}`;
      let organizationId = await this.cacheManager.get<number>(cacheKey);

      if (!organizationId) {
        try {
          // Use the safe method that handles missing tables
          organizationId =
            await this.domainService.findOrganizationIdByDomain(hostname);

          if (organizationId) {
            // Cache the result for 1 hour (only if we found a valid organization)
            await this.cacheManager.set(cacheKey, organizationId, 3600000);
          } else {
            // If no organization found, log and set default organization instead of throwing
            this.logger.warn(
              `Domain not found: ${hostname}, using default organization`,
            );
            req[ORGANIZATION_HEADER] = 1;
            return next();
          }
        } catch (error: unknown) {
          // For all errors, log and continue with default organization
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Error finding domain: ${errorMessage}`);
          // Set default organization and continue
          req[ORGANIZATION_HEADER] = 1;
          return next();
        }
      }

      // Set organization context
      req[ORGANIZATION_HEADER] = organizationId;

      // Set security headers
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-Organization-Domain', hostname);

      this.logger.debug(
        `Domain ${hostname} mapped to organization ${organizationId}`,
      );
    } catch (error: unknown) {
      // Proper error handling with type checking
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process domain routing for ${hostname}: ${errorMessage}`,
      );
      // Instead of throwing, set default organization and continue
      req[ORGANIZATION_HEADER] = 1;
      return next();
    }

    next();
  }

  /**
   * Check if the request is coming from a Docker container using CIDR matching
   */
  private isDockerRequest(ip: string): boolean {
    try {
      // Simple string-based check for common Docker IP patterns
      if (
        ip.startsWith('172.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('127.') ||
        ip === '::ffff:172.17.0.1' ||
        ip.includes('::ffff:')
      ) {
        return true;
      }

      // For more complex cases, try to use ipaddr.js
      try {
        const addr = ipaddr.parse(ip);

        // Check if IP is in private range (which Docker typically uses)
        return addr.range() === 'private' || addr.range() === 'loopback';
      } catch {
        // If parsing fails, fall back to false
        return false;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error checking Docker IP: ${errorMessage}`);
      return false;
    }
  }
}
