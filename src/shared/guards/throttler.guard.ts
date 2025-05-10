import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { RequestWithUser } from '@/shared/types/request.types';

@Injectable()
export class CustomThrottlerGuard extends NestThrottlerGuard {
  /**
   * Override canActivate to bypass throttling for metrics endpoints
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const path = request.path || '';

    // Bypass throttling in development mode
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // Bypass throttling for metrics endpoints
    if (
      path === '/metrics' ||
      path.startsWith('/metrics/') ||
      path.includes('check_path=%2Fmetrics')
    ) {
      return true;
    }

    // For all other endpoints, use the standard throttling logic
    return super.canActivate(context);
  }

  /**
   * Generate throttle key based on user ID or IP address
   */
  protected generateKey(context: ExecutionContext, suffix: string): string {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.id;

    // Use user ID if available, otherwise fallback to IP + user agent
    const identifier = userId || this.getTrackingKey(request);
    return `${identifier}-${suffix}`;
  }

  /**
   * Get tracking key based on IP and user agent
   */
  private getTrackingKey(request: RequestWithUser): string {
    const ip = this.getIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    return `${ip}-${userAgent}`;
  }

  /**
   * Get client IP address
   */
  private getIp(request: RequestWithUser): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get tracker for rate limiting
   */
  protected async getTracker(request: RequestWithUser): Promise<string> {
    // If user is authenticated, include their ID in the tracker
    if (request.user?.id) {
      return `user-${request.user.id}`;
    }

    // For non-authenticated requests, use IP + partial User-Agent
    const userAgent = request.headers['user-agent'] || 'unknown';
    const userAgentHash = crypto
      .createHash('md5')
      .update(userAgent)
      .digest('hex')
      .slice(0, 8);

    return `ip-${request.ip}-${userAgentHash}`;
  }
}
