import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AccessToken } from '@prisma/client';
import { IAccessTokenRepository } from '../interfaces/repository.interface';
import { CreateAccessTokenDto } from '../dto/access-token.dto';
import { BaseRepository } from '@/shared/repositories/base.repository';
import * as crypto from 'crypto';

/**
 * @class AccessTokenRepository
 * @implements {IAccessTokenRepository}
 * @extends {BaseRepository<AccessToken>}
 *
 * Repository for managing access tokens in the database
 */
@Injectable()
export class AccessTokenRepository
  extends BaseRepository<AccessToken>
  implements IAccessTokenRepository
{
  protected readonly logger = new Logger(AccessTokenRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'accessToken');
  }

  protected isTenantAware(): boolean {
    // Access tokens are user-specific, not tenant-specific
    return false;
  }

  /**
   * Creates a new access token
   */
  async createToken(
    userId: number,
    dto: CreateAccessTokenDto,
  ): Promise<AccessToken> {
    // Generate a secure token
    const token = this.generateToken();

    // Calculate expiration date from TTL if provided
    const expiresAt = dto.ttl ? new Date(Date.now() + dto.ttl * 1000) : null;

    return this.executeQuery(
      () =>
        this.prisma.accessToken.create({
          data: {
            name: dto.name,
            token,
            userId,
            description: dto.description,
            expiresAt,
            scope: dto.scope || ['all'],
          },
        }),
      `Failed to create access token for user ${userId}`,
    );
  }

  /**
   * Generates a secure random token
   * @private
   */
  private generateToken(): string {
    // Generate a random token (32 bytes, hex encoded)
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Finds an access token by its token value
   */
  async findByToken(token: string): Promise<AccessToken | null> {
    return this.executeQuery(
      () =>
        this.prisma.accessToken.findFirst({
          where: { token },
        }),
      `Failed to find access token by value`,
    );
  }

  /**
   * Finds an access token by name for a specific user
   */
  async findByName(userId: number, name: string): Promise<AccessToken | null> {
    return this.executeQuery(
      () =>
        this.prisma.accessToken.findFirst({
          where: {
            userId,
            name,
          },
        }),
      `Failed to find access token with name ${name} for user ${userId}`,
    );
  }

  /**
   * Finds all access tokens for a specific user
   */
  async findAllByUserId(userId: number): Promise<AccessToken[]> {
    return this.executeQuery(
      () =>
        this.prisma.accessToken.findMany({
          where: { userId },
        }),
      `Failed to find access tokens for user ${userId}`,
    );
  }

  /**
   * Deletes an access token
   */
  async deleteToken(userId: number, tokenId: string): Promise<void> {
    await this.executeQuery(
      () =>
        this.prisma.accessToken.deleteMany({
          where: {
            id: tokenId,
            userId,
          },
        }),
      `Failed to delete access token ${tokenId} for user ${userId}`,
    );
  }

  /**
   * Validates a token for authentication
   */
  async validateToken(token: string): Promise<AccessToken | null> {
    return this.executeQuery(async () => {
      const accessToken = await this.prisma.accessToken.findFirst({
        where: { token },
      });

      if (!accessToken) {
        return null;
      }

      // Check expiration
      if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
        this.logger.debug(`Token expired: ${accessToken.id}`);
        return null;
      }

      // Update last used timestamp
      await this.prisma.accessToken.update({
        where: { id: accessToken.id },
        data: { lastUsedAt: new Date() },
      });

      return accessToken;
    }, `Failed to validate access token`);
  }
}
