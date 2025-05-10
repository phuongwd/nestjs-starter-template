import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { JwtPayload, TokenVersion, TokenRevocation } from '../types/jwt.types';
import { RedisService } from '../../../core/redis/redis.service';
import { FingerprintService } from './fingerprint.service';

/**
 * Service for handling secure JWT operations
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly TOKEN_VERSION_PREFIX = 'token:version';
  private readonly TOKEN_REVOCATION_PREFIX = 'token:revocation';
  private readonly TOKEN_VERSION_TTL: number;
  private readonly TOKEN_REVOCATION_TTL: number;
  private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly USER_TOKENS_PREFIX = 'user:tokens:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly fingerprintService: FingerprintService,
  ) {
    this.TOKEN_VERSION_TTL = this.configService.get<number>(
      'TOKEN_VERSION_TTL',
      604800,
    ); // 7 days
    this.TOKEN_REVOCATION_TTL = this.configService.get<number>(
      'TOKEN_REVOCATION_TTL',
      86400,
    ); // 1 day
  }

  /**
   * Generate a secure JWT token with minimal payload
   */
  async generateToken(userId: number, req: Request): Promise<string> {
    const tokenId = crypto.randomBytes(32).toString('hex');
    const fingerprint = this.fingerprintService.generateFingerprint(req);

    const payload: JwtPayload = {
      sub: userId,
      jti: tokenId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      fgp: fingerprint,
      ver: await this.getCurrentTokenVersion(userId),
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Validate a token and its fingerprint
   */
  async validateToken(token: string, req: Request): Promise<boolean> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.redisService.get(
        `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
      );
      if (isBlacklisted) {
        this.logger.debug('Token is blacklisted');
        return false;
      }

      // Verify JWT and get payload
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      this.logger.debug('Token payload:', {
        sub: payload.sub,
        jti: payload.jti,
        fgp: payload.fgp,
        ver: payload.ver,
      });

      this.logger.debug('Request details:', {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        xForwardedFor: req.headers['x-forwarded-for'],
        remoteAddress: req.socket.remoteAddress,
      });

      // Verify fingerprint with rate limiting
      const currentFingerprint =
        this.fingerprintService.generateFingerprint(req);
      const fingerprintValid = this.fingerprintService.compareFingerprints(
        payload.fgp,
        currentFingerprint,
        req.ip, // Pass IP for rate limiting
      );

      if (!fingerprintValid) {
        this.logger.warn('Token fingerprint mismatch', {
          storedFingerprint: payload.fgp,
          currentFingerprint,
          ip: req.ip,
        });
        return false;
      }

      // Check if token is revoked
      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
        this.logger.debug(`Token ${payload.jti} is revoked`);
        return false;
      }

      // Verify token version
      const currentVersion = await this.getCurrentTokenVersion(payload.sub);
      if (payload.ver !== currentVersion) {
        this.logger.debug(`Token version mismatch for user ${payload.sub}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Token validation failed', {
        error: error instanceof Error ? error.stack : String(error),
      });
      return false;
    }
  }

  /**
   * Get current token version for a user
   */
  async getCurrentTokenVersion(userId: number): Promise<number> {
    try {
      const key = `${this.TOKEN_VERSION_PREFIX}:${userId}`;
      const version = await this.redisService.get<TokenVersion>(key);

      if (version) {
        return version.currentVersion;
      }

      // Initialize new version
      const newVersion: TokenVersion = {
        userId,
        currentVersion: 1,
        updatedAt: new Date(),
      };

      await this.redisService.set(key, newVersion, this.TOKEN_VERSION_TTL);
      return newVersion.currentVersion;
    } catch (error) {
      this.logger.error(
        `Error getting token version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Increment token version for a user (invalidates all existing tokens)
   */
  async incrementTokenVersion(userId: number): Promise<void> {
    try {
      const key = `${this.TOKEN_VERSION_PREFIX}:${userId}`;
      const version = await this.redisService.get<TokenVersion>(key);

      const newVersion: TokenVersion = {
        userId,
        currentVersion: (version?.currentVersion || 0) + 1,
        updatedAt: new Date(),
      };

      await this.redisService.set(key, newVersion, this.TOKEN_VERSION_TTL);
    } catch (error) {
      this.logger.error(
        `Error incrementing token version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Check if a token is revoked
   */
  private async isTokenRevoked(jti: string): Promise<boolean> {
    try {
      const key = `${this.TOKEN_REVOCATION_PREFIX}:${jti}`;
      const revocation = await this.redisService.get<TokenRevocation>(key);
      return !!revocation;
    } catch (error) {
      this.logger.error(
        `Error checking token revocation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(
    jti: string,
    userId: number,
    reason: string,
  ): Promise<void> {
    try {
      const key = `${this.TOKEN_REVOCATION_PREFIX}:${jti}`;
      const revocation: TokenRevocation = {
        jti,
        userId,
        revokedAt: new Date(),
        reason,
      };

      await this.redisService.set(key, revocation, this.TOKEN_REVOCATION_TTL);
      this.logger.debug(`Token ${jti} revoked for user ${userId}: ${reason}`);
    } catch (error) {
      this.logger.error(
        `Error revoking token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user by incrementing their token version
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      // Increment token version to invalidate all existing tokens
      const versionKey = `${this.TOKEN_VERSION_PREFIX}:${userId}`;
      const newVersion: TokenVersion = {
        userId,
        currentVersion: (await this.getCurrentTokenVersion(userId)) + 1,
        updatedAt: new Date(),
      };
      await this.redisService.set(
        versionKey,
        newVersion,
        this.TOKEN_VERSION_TTL,
      );

      // Add current tokens to blacklist
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const tokens = await this.redisService.get<string[]>(userTokensKey);

      if (tokens?.length) {
        await Promise.all(
          tokens.map((token) =>
            this.redisService.set(
              `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
              'revoked',
              this.TOKEN_REVOCATION_TTL,
            ),
          ),
        );
      }

      // Clear the user's token list
      await this.redisService.del(userTokensKey);

      this.logger.debug(`Revoked all tokens for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke tokens for user ${userId}`, {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  }

  /**
   * Track tokens for a user to enable revocation
   * @param userId - The user ID
   * @param tokens - Array of tokens to track
   */
  async trackUserTokens(userId: number, tokens: string[]): Promise<void> {
    try {
      if (!tokens.length) {
        return;
      }

      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const existingTokens =
        (await this.redisService.get<string[]>(userTokensKey)) || [];
      const updatedTokens = [...existingTokens, ...tokens];

      await this.redisService.set(
        userTokensKey,
        updatedTokens,
        this.TOKEN_VERSION_TTL,
      );
      this.logger.debug(`Tracked ${tokens.length} tokens for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error tracking tokens for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw error as this should not block the authentication flow
    }
  }
}
