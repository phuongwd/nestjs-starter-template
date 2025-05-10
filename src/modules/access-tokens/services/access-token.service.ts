import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { add } from 'date-fns';
import { IAccessTokenRepository } from '../interfaces/repository.interface';
import { IAccessTokenService } from '../interfaces/service.interface';
import { ACCESS_TOKEN_INJECTION_TOKENS } from '../constants/injection-tokens';
import {
  CreateAccessTokenDto,
  AccessTokenResponseDto,
} from '../dto/access-token.dto';
import { ErrorUtil } from '@/shared/utils/error.util';
/**
 * @class AccessTokenService
 * @implements {IAccessTokenService}
 *
 * Service for managing API access tokens
 */
@Injectable()
export class AccessTokenService implements IAccessTokenService {
  private readonly logger = new Logger(AccessTokenService.name);

  constructor(
    @Inject(ACCESS_TOKEN_INJECTION_TOKENS.REPOSITORY.ACCESS_TOKEN)
    private readonly accessTokenRepository: IAccessTokenRepository,
  ) {}

  /**
   * Creates a new access token for a user
   * @param userId The user ID
   * @param dto The token creation data
   * @returns The created access token
   */
  async createToken(
    userId: number | string,
    dto: CreateAccessTokenDto,
  ): Promise<AccessTokenResponseDto> {
    try {
      // Convert userId to number if it's a string
      const userIdNum = this.normalizeUserId(userId);

      // Generate a secure random token
      const token = this.generateToken();

      // Calculate expiration date if TTL is provided
      const expiresAt = dto.ttl ? add(new Date(), { seconds: dto.ttl }) : null;

      // Create a data object for the repository that includes token
      const tokenData = {
        name: dto.name,
        description: dto.description,
        scope: dto.scope || ['all'],
        token,
        expiresAt,
      };

      // Create the token in the database using the repository
      const createdToken = await this.accessTokenRepository.createToken(
        userIdNum,
        tokenData,
      );

      // Handle null description properly to match the interface
      const description =
        createdToken.description === null
          ? undefined
          : createdToken.description;

      return {
        id: createdToken.id,
        name: createdToken.name,
        description,
        userId: userIdNum.toString(), // Convert to string to match interface
        createdAt: createdToken.createdAt,
        expiresAt: createdToken.expiresAt,
        lastUsedAt: createdToken.lastUsedAt,
        scope: createdToken.scope,
        token, // Include the token in the response
        friendlyName: `${createdToken.name} (${createdToken.id.substring(0, 8)})`,
        isSession: false,
      };
    } catch (error: unknown) {
      return ErrorUtil.handleError(
        error,
        this.logger,
        `Failed to create access token for user ${userId}`,
      );
    }
  }

  /**
   * Gets all access tokens for a user
   * @param userId The user ID
   * @returns Array of access tokens (without the actual token values)
   */
  async getTokens(userId: number | string): Promise<AccessTokenResponseDto[]> {
    try {
      // Convert userId to number if it's a string
      const userIdNum = this.normalizeUserId(userId);

      const tokens =
        await this.accessTokenRepository.findAllByUserId(userIdNum);

      // Map to response type (omitting the actual token value)
      return tokens.map((token) => {
        // Handle null values properly to match the interface
        const description =
          token.description === null ? undefined : token.description;

        return {
          id: token.id,
          name: token.name,
          description,
          userId: token.userId.toString(), // Convert to string to match interface
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          lastUsedAt: token.lastUsedAt,
          scope: token.scope,
          friendlyName: `${token.name} (${token.id.substring(0, 8)})`,
          isSession: false,
        };
      });
    } catch (error: unknown) {
      return ErrorUtil.handleError(
        error,
        this.logger,
        `Failed to get access tokens for user ${userId}`,
      );
    }
  }

  /**
   * Deletes an access token
   * @param userId The user ID
   * @param tokenId The token ID
   */
  async deleteToken(userId: number | string, tokenId: string): Promise<void> {
    try {
      // Convert userId to number if it's a string
      const userIdNum = this.normalizeUserId(userId);

      const token = await this.accessTokenRepository.findByToken(tokenId);

      if (!token || token.userId !== userIdNum) {
        throw new NotFoundException('Access token not found');
      }

      await this.accessTokenRepository.deleteToken(userIdNum, tokenId);
    } catch (error: unknown) {
      ErrorUtil.handleError(
        error,
        this.logger,
        `Failed to delete access token ${tokenId} for user ${userId}`,
      );
    }
  }

  /**
   * Validates a token for authentication
   * @param token The token value
   * @param requiredScopes Optional array of required scopes
   * @returns The user ID associated with the token if valid
   * @throws UnauthorizedException if the token is invalid or doesn't have required scopes
   */
  async validateToken(
    token: string,
    requiredScopes?: string[],
  ): Promise<string> {
    try {
      const accessToken = await this.accessTokenRepository.validateToken(token);

      // Check if token exists
      if (!accessToken) {
        throw new UnauthorizedException('Invalid access token');
      }

      // Check if token has required scopes
      if (
        requiredScopes &&
        requiredScopes.length > 0 &&
        !requiredScopes.every(
          (scope) =>
            accessToken.scope.includes(scope) ||
            accessToken.scope.includes('all'),
        )
      ) {
        throw new UnauthorizedException(
          'Access token does not have required scopes',
        );
      }

      // Return user ID as string to match the expected interface
      return accessToken.userId.toString();
    } catch (error: unknown) {
      return ErrorUtil.handleError(
        error,
        this.logger,
        `Failed to validate token`,
      );
    }
  }

  /**
   * Generates a secure random token
   * @returns A random token string
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Normalizes a user ID to always be a number
   * @param userId The user ID as string or number
   * @returns The normalized user ID as number
   */
  private normalizeUserId(userId: number | string): number {
    return typeof userId === 'string' ? parseInt(userId, 10) : userId;
  }
}
