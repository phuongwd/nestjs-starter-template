import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';

/**
 * Error thrown when fingerprint validation fails due to rate limiting
 */
export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Rate limit information for tracking requests
 */
interface RateLimitInfo {
  attempts: number;
  lastAttempt: number;
}

/**
 * Configuration for fingerprint rate limiting
 */
interface FingerprintRateLimitConfig {
  maxAttempts: number;
  resetAfterMs: number;
  timeWindowMs: number;
}

/**
 * Client information extracted from request
 */
interface ClientInfo {
  ip: string;
  userAgent: string;
}

/**
 * Service responsible for generating and validating request fingerprints
 * This helps prevent token reuse across different devices/locations
 */
@Injectable()
export class FingerprintService {
  private readonly logger = new Logger(FingerprintService.name);
  private readonly rateLimits = new Map<string, RateLimitInfo>();
  private readonly salt: string;
  private readonly config: FingerprintRateLimitConfig;

  constructor(private readonly configService: ConfigService) {
    this.salt = this.configService.getOrThrow<string>('JWT_SECRET');
    this.config = this.initializeConfig(this.configService);

    this.logger.log(
      `Fingerprint rate limiting configured: MAX_ATTEMPTS=${this.config.maxAttempts}, ` +
        `RESET_AFTER=${this.config.resetAfterMs / 60000}min, ` +
        `TIME_WINDOW=${this.config.timeWindowMs / 60000}min, ` +
        `isDevelopment=${process.env.NODE_ENV === 'development'}`,
    );
  }

  /**
   * Initialize rate limiting configuration based on environment
   */
  private initializeConfig(
    configService: ConfigService,
  ): FingerprintRateLimitConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // If in development mode, use higher limits to reduce friction
    if (isDevelopment) {
      return {
        maxAttempts: 1000,
        resetAfterMs: 60 * 60 * 1000, // 1 hour
        timeWindowMs: 30 * 60 * 1000, // 30 minutes
      };
    }

    // Otherwise use configured production values with sensible defaults
    return {
      maxAttempts:
        configService.get<number>('AUTH_FINGERPRINT_MAX_ATTEMPTS') || 5,
      resetAfterMs:
        configService.get<number>('AUTH_FINGERPRINT_RESET_AFTER') ||
        15 * 60 * 1000, // 15 minutes
      timeWindowMs:
        configService.get<number>('AUTH_FINGERPRINT_TIME_WINDOW') ||
        5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Generate a fingerprint from request
   * Includes time window and salt for additional security
   */
  public generateFingerprint(req: Request): string {
    const clientInfo = this.getClientInfo(req);
    const timeWindow = this.calculateTimeWindow();

    // Combine all elements with salt
    const data = `${clientInfo.ip}|${clientInfo.userAgent}|${timeWindow}|${this.salt}`;

    this.logger.debug('Generating fingerprint:', {
      normalizedData: data.replace(this.salt, '[HIDDEN]'),
      timeWindow,
      now: Date.now(),
      ...clientInfo,
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Compare two fingerprints with rate limiting
   * @throws RateLimitExceededError if too many invalid attempts
   */
  public compareFingerprints(
    storedFingerprint: string,
    currentFingerprint: string,
    ip?: string,
  ): boolean {
    // Apply rate limiting if IP is provided
    if (ip) {
      const normalizedIp = this.normalizeIp(ip);
      this.checkRateLimit(normalizedIp);
    }

    const match = storedFingerprint === currentFingerprint;

    this.logger.debug('Fingerprint comparison:', {
      stored: storedFingerprint,
      current: currentFingerprint,
      match,
      ip: ip ? this.normalizeIp(ip) : undefined,
    });

    return match;
  }

  /**
   * Calculate time window for consistent fingerprint generation
   */
  private calculateTimeWindow(timestamp: number = Date.now()): number {
    return (
      Math.floor(timestamp / this.config.timeWindowMs) *
      this.config.timeWindowMs
    );
  }

  /**
   * Check rate limit for an IP address
   * @throws RateLimitExceededError if too many attempts
   */
  private checkRateLimit(ip: string): void {
    const now = Date.now();
    const info = this.rateLimits.get(ip) || { attempts: 0, lastAttempt: now };

    // Reset if outside window
    if (now - info.lastAttempt >= this.config.resetAfterMs) {
      info.attempts = 0;
      info.lastAttempt = now;
      this.rateLimits.set(ip, info);
      return;
    }

    // Check limit
    if (info.attempts >= this.config.maxAttempts) {
      throw new RateLimitExceededError(`Rate limit exceeded for IP ${ip}`);
    }

    // Update attempts
    info.attempts += 1;
    info.lastAttempt = now;
    this.rateLimits.set(ip, info);
  }

  /**
   * Extract client information from request
   */
  private getClientInfo(req: Request): ClientInfo {
    const ip = this.normalizeIp(req.ip);
    const userAgent = this.normalizeUserAgent(req.headers['user-agent']);

    this.logger.debug('Extracted client info:', {
      ip,
      originalIp: req.ip,
      userAgent,
      originalUserAgent: req.headers['user-agent'],
      xForwardedFor: req.headers['x-forwarded-for'],
      remoteAddress: req.socket.remoteAddress,
    });

    return { ip, userAgent };
  }

  /**
   * Normalize an IP address
   * - Converts IPv6 localhost to IPv4
   * - Handles null/undefined values
   * - Normalizes format
   */
  private normalizeIp(ip: string | undefined): string {
    if (!ip) return 'unknown';
    const normalizedIp = ip.toLowerCase().trim();
    // Convert various localhost formats to consistent representation
    if (normalizedIp === '::1' || normalizedIp === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    return normalizedIp;
  }

  /**
   * Normalize a user agent string
   * - Handles null/undefined values
   * - Normalizes format
   */
  private normalizeUserAgent(userAgent: string | undefined): string {
    return (userAgent || 'unknown').toLowerCase().trim();
  }

  /**
   * Get current metrics
   * @returns Object with validation metrics
   */
  public getMetrics(): { rateLimits: number } {
    return {
      rateLimits: this.rateLimits.size,
    };
  }
}
