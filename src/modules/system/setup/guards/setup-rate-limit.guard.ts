import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Rate limit guard for setup operations
 * @description Prevents brute force attempts by limiting request frequency
 */
@Injectable()
export class SetupRateLimitGuard implements CanActivate {
  private readonly requestMap = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(private readonly configService: ConfigService) {
    // Default: 5 requests per minute
    this.windowMs =
      this.configService.get<number>('SETUP_RATE_LIMIT_WINDOW_MS') || 60000;
    this.maxRequests =
      this.configService.get<number>('SETUP_RATE_LIMIT_MAX_REQUESTS') || 5;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;

    // Get current timestamp
    const now = Date.now();

    // Get existing requests for this IP
    let requests = this.requestMap.get(ip) || [];

    // Remove requests outside the window
    requests = requests.filter((timestamp) => now - timestamp < this.windowMs);

    // Check if rate limit is exceeded
    if (requests.length >= this.maxRequests) {
      throw new HttpException(
        'Too many requests, please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add current request
    requests.push(now);
    this.requestMap.set(ip, requests);

    return true;
  }
}
