import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '@/core/redis/redis.service';
import * as crypto from 'crypto';
import {
  OAuthProvider,
  OAuthPlatform,
  AppleUserProfile,
} from '../interfaces/oauth.interface';

export interface OAuthStateMetadata {
  provider: OAuthProvider;
  clientIp?: string;
  userAgent?: string;
  platform?: OAuthPlatform;
  timestamp?: number;
  nonce?: string;
  [key: string]: string | number | undefined; // Allow both string and number
}

@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly STATE_PREFIX = 'oauth:state:';
  private readonly APPLE_USER_PREFIX = 'oauth:apple:user:';
  private readonly STATE_TTL = 600; // 10 minutes in seconds
  private readonly STATE_LENGTH = 32; // Length of random bytes for state

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate a new state parameter and store it in Redis with metadata
   * @param metadata Additional data to store with the state
   * @returns Promise<string> The generated state token
   * @throws {UnauthorizedException} if state generation fails
   */
  async generateState(metadata: OAuthStateMetadata): Promise<string> {
    try {
      // Add timestamp and nonce for additional security
      const stateMetadata: OAuthStateMetadata = {
        ...metadata,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex'),
      };

      const state = crypto.randomBytes(this.STATE_LENGTH).toString('base64url');
      await this.redisService.set(
        `${this.STATE_PREFIX}${state}`,
        stateMetadata,
        this.STATE_TTL,
      );

      return state;
    } catch (error: unknown) {
      this.logger.error('Failed to generate state', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { provider: metadata.provider, platform: metadata.platform },
      });
      throw new UnauthorizedException('Failed to initialize authentication');
    }
  }

  /**
   * Validate and consume a state parameter
   * @param state The state parameter to validate
   * @param expectedMetadata Metadata to validate against
   * @param maxAge Maximum age of the state in milliseconds (optional)
   * @returns Promise<OAuthStateMetadata> The validated metadata
   * @throws {UnauthorizedException} if state is invalid, expired, or metadata doesn't match
   */
  async validateState(
    state: string,
    expectedMetadata: Partial<OAuthStateMetadata>,
    maxAge?: number,
  ): Promise<OAuthStateMetadata> {
    try {
      const metadata = await this.redisService.get<OAuthStateMetadata>(
        `${this.STATE_PREFIX}${state}`,
      );

      if (!metadata) {
        throw new UnauthorizedException('Invalid or expired state parameter');
      }

      // Validate timestamp if maxAge is provided
      if (maxAge && metadata.timestamp) {
        const age = Date.now() - metadata.timestamp;
        if (age > maxAge) {
          throw new UnauthorizedException('State parameter has expired');
        }
      }

      // Validate the metadata matches what we expect
      for (const [key, value] of Object.entries(expectedMetadata)) {
        if (metadata[key] !== value) {
          throw new UnauthorizedException('Invalid state parameter');
        }
      }

      // Delete the state after validation
      await this.redisService.del(`${this.STATE_PREFIX}${state}`);

      return metadata;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('State validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: expectedMetadata,
      });
      throw new UnauthorizedException('Failed to validate state');
    }
  }

  /**
   * Store Apple user data temporarily
   * @param state The state parameter to associate with the user data
   * @param userData The Apple user data to store
   */
  async storeAppleUserData(
    state: string,
    userData: Pick<AppleUserProfile, 'name' | 'email'>,
  ): Promise<void> {
    try {
      await this.redisService.set(
        `${this.APPLE_USER_PREFIX}${state}`,
        userData,
        this.STATE_TTL,
      );
    } catch (error) {
      this.logger.error('Failed to store Apple user data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        state,
      });
      throw new UnauthorizedException('Failed to store user data');
    }
  }

  /**
   * Retrieve and delete Apple user data
   * @param state The state parameter associated with the user data
   * @returns Promise<AppleUserProfile | null> The stored user data or null if not found
   */
  async getAppleUserData(
    state: string,
  ): Promise<Pick<AppleUserProfile, 'name' | 'email'> | null> {
    try {
      const data = await this.redisService.get<
        Pick<AppleUserProfile, 'name' | 'email'>
      >(`${this.APPLE_USER_PREFIX}${state}`);
      if (data) {
        await this.redisService.del(`${this.APPLE_USER_PREFIX}${state}`);
      }
      return data;
    } catch (error) {
      this.logger.error('Failed to retrieve Apple user data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        state,
      });
      return null;
    }
  }
}
