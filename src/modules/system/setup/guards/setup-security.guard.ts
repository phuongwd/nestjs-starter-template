import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISetupService } from '../interfaces/setup-service.interface';
import { SETUP_TOKENS } from '../constants/setup.constants';
import { Request } from 'express';

/**
 * Guard to enforce security checks for setup operations
 * @description Validates setup state and prevents unauthorized access
 */
@Injectable()
export class SetupSecurityGuard implements CanActivate {
  private readonly allowedIPs: string[];
  private readonly excludedPaths: string[] = [
    '/health',
    '/health/quick',
    '/api/v1/health',
    '/api/v1/health/quick',
    '/metrics',
  ];

  constructor(
    @Inject(SETUP_TOKENS.SERVICE.SETUP)
    private readonly setupService: ISetupService,
    private readonly configService: ConfigService,
  ) {
    // Initialize allowed IPs from config
    this.allowedIPs = this.configService.get<string[]>('setup.allowedIPs') || [
      '127.0.0.1',
      'localhost',
      '::1',
    ];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip health check endpoints
    if (this.isExcludedPath(request.path)) {
      return true;
    }

    const isSetupRequired = await this.setupService.isSetupRequired();

    // Allow setup operations only if setup is required
    if (!isSetupRequired) {
      throw new UnauthorizedException('System is already set up');
    }

    // Validate client IP
    const clientIP = request.ip;
    if (!this.isIPAllowed(clientIP)) {
      throw new ForbiddenException(
        'Setup operations are not allowed from this IP address',
      );
    }

    // Validate request origin if present
    const origin = request.headers.origin;
    if (origin && !this.isOriginAllowed(origin)) {
      throw new ForbiddenException('Invalid request origin');
    }

    // Validate setup token if present in headers
    const setupToken = request.headers['x-setup-token'] as string | undefined;
    if (setupToken) {
      const isValid = await this.setupService.validateToken(
        setupToken,
        clientIP || 'unknown',
      );
      if (!isValid) {
        throw new UnauthorizedException('Invalid setup token');
      }
    }

    return true;
  }

  private isExcludedPath(path: string): boolean {
    return this.excludedPaths.some(
      (excludedPath) => path === excludedPath || path.endsWith(excludedPath),
    );
  }

  private isIPAllowed(ip: string | undefined): boolean {
    if (!ip) return false;
    return this.allowedIPs.some((allowedIP) => {
      // Handle IPv6 localhost
      if (
        ip === '::1' &&
        (allowedIP === 'localhost' || allowedIP === '127.0.0.1')
      ) {
        return true;
      }
      return ip === allowedIP;
    });
  }

  private isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return false;
    const allowedOrigins = this.configService.get<string[]>(
      'setup.allowedOrigins',
    ) || ['localhost'];
    return allowedOrigins.some((allowed) => origin.includes(allowed));
  }
}
