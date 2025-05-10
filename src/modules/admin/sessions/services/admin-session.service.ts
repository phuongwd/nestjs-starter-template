import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AdminSession, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/core/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { IAdminSessionRepository } from '../interfaces/admin-session.repository.interface';
import { INJECTION_TOKENS } from '@/modules/admin/shared/constants/injection-tokens';

interface CreateSessionOptions {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service for managing admin sessions
 * Handles session creation, validation, and cleanup
 * Uses both Redis for fast access and PostgreSQL for persistence
 */
@Injectable()
export class AdminSessionService {
  private readonly logger = new Logger(AdminSessionService.name);
  private readonly sessionDuration: number;
  private readonly redisKeyPrefix = 'admin_session:';

  constructor(
    @Inject(INJECTION_TOKENS.REPOSITORY.ADMIN_SESSION)
    private readonly sessionRepository: IAdminSessionRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Default session duration is 4 hours
    this.sessionDuration = this.configService.get<number>(
      'ADMIN_SESSION_DURATION_HOURS',
      4,
    );
  }

  /**
   * Create a new admin session
   */
  async createSession(options: CreateSessionOptions): Promise<AdminSession> {
    try {
      // Create session in database
      const session = await this.sessionRepository.create({
        userId: options.userId,
        token: uuidv4(),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        expiresAt: this.calculateExpirationTime(),
      });

      // Store session data in Redis for quick access
      await this.storeSessionInRedis(session);

      this.logger.log(`Created admin session for user ${options.userId}`);
      return session;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error(`Failed to create admin session: ${error.message}`);
      throw new UnauthorizedException('Failed to create admin session');
    }
  }

  /**
   * Validate an admin session
   */
  async validateSession(token: string): Promise<AdminSession> {
    try {
      // Try to get session from Redis first
      const cachedSession = await this.getSessionFromRedis(token);
      if (cachedSession) {
        // Check if session is valid
        if (this.isSessionValid(cachedSession)) {
          await this.updateSessionActivity(cachedSession);
          return cachedSession;
        }
        // If session is invalid, remove it from Redis
        await this.removeSessionFromRedis(token);
      }

      // If not in Redis or invalid, check database
      const session = await this.sessionRepository.findByToken(token);
      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      if (!this.isSessionValid(session)) {
        throw new UnauthorizedException(
          session.revokedAt
            ? 'Session has been revoked'
            : 'Session has expired',
        );
      }

      // Update session activity
      const updatedSession = await this.updateSessionActivity(session);

      // Store updated session in Redis
      await this.storeSessionInRedis(updatedSession);

      return updatedSession;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error(`Session validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid session');
    }
  }

  /**
   * Revoke an admin session
   */
  async revokeSession(token: string): Promise<void> {
    try {
      await this.sessionRepository.revoke(token);
      await this.removeSessionFromRedis(token);
      this.logger.log(`Revoked admin session: ${token}`);
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Session not found');
      }
      const error = err instanceof Error ? err : new Error('Unknown error');
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: number): Promise<AdminSession[]> {
    return this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeOtherSessions(
    userId: number,
    currentToken: string,
  ): Promise<void> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);

    // Revoke each session except the current one
    await Promise.all(
      sessions
        .filter((session) => session.token !== currentToken)
        .map((session) => this.revokeSession(session.token)),
    );

    this.logger.log(`Revoked all other sessions for user ${userId}`);
  }

  /**
   * Clean up expired and revoked sessions
   */
  async cleanupSessions(): Promise<number> {
    const count = await this.sessionRepository.deleteExpiredAndRevoked();
    this.logger.log(`Cleaned up ${count} expired/revoked sessions`);
    return count;
  }

  /**
   * Store session data in Redis
   */
  private async storeSessionInRedis(session: AdminSession): Promise<void> {
    const key = this.getRedisKey(session.token);
    const ttl = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - new Date().getTime()) / 1000),
    );

    await this.redisService.set(key, session, ttl);
  }

  /**
   * Get session data from Redis
   */
  private async getSessionFromRedis(
    token: string,
  ): Promise<AdminSession | null> {
    const key = this.getRedisKey(token);
    return this.redisService.get<AdminSession>(key);
  }

  /**
   * Remove session data from Redis
   */
  private async removeSessionFromRedis(token: string): Promise<void> {
    const key = this.getRedisKey(token);
    await this.redisService.del(key);
  }

  /**
   * Update session activity timestamp
   */
  private async updateSessionActivity(
    session: AdminSession,
  ): Promise<AdminSession> {
    const updatedSession = await this.sessionRepository.updateActivity(
      session.id,
    );
    await this.storeSessionInRedis(updatedSession);
    return updatedSession;
  }

  /**
   * Check if a session is valid
   */
  private isSessionValid(session: AdminSession): boolean {
    if (session.revokedAt) {
      return false;
    }
    return session.expiresAt > new Date();
  }

  /**
   * Calculate session expiration time
   */
  private calculateExpirationTime(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.sessionDuration);
    return expiresAt;
  }

  /**
   * Generate Redis key for session
   */
  private getRedisKey(token: string): string {
    return `${this.redisKeyPrefix}${token}`;
  }
}
