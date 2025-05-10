import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { SetupToken } from '@prisma/client';
import { ISetupService } from '../interfaces/setup-service.interface';
import { ISetupTokenRepository } from '../interfaces/setup-token.interface';
import {
  SETUP_TOKEN_LENGTH,
  SETUP_TOKEN_VALIDITY_HOURS,
  SetupAuditAction,
} from '../constants/setup.constants';
import { SetupCompletionData } from '../interfaces/setup-service.interface';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Setup service implementation
 * @description Handles admin setup operations
 */
@Injectable()
export class SetupService implements ISetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly setupTokenRepository: ISetupTokenRepository,
  ) {}

  /**
   * Generate a new setup token
   * @param ip IP address requesting the token
   * @param fingerprint Optional browser fingerprint
   */
  async generateToken(ip: string, fingerprint?: string): Promise<SetupToken> {
    const token = randomBytes(SETUP_TOKEN_LENGTH / 2).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SETUP_TOKEN_VALIDITY_HOURS);

    const setupToken = await this.setupTokenRepository.createToken({
      token,
      expiresAt,
      createdByIp: ip,
      environment: this.configService.get('NODE_ENV') || 'development',
      fingerprint,
      metadata: {
        source: fingerprint ? 'api' : 'cli',
      },
    });

    await this.setupTokenRepository.createAuditEntry({
      tokenId: setupToken.id,
      action: SetupAuditAction.TOKEN_GENERATED,
      ip,
      success: true,
      metadata: { fingerprint },
    });

    return setupToken;
  }

  /**
   * Complete the admin setup process
   * @param data Setup completion data
   * @param ip IP address completing setup
   */
  async completeSetup(data: SetupCompletionData, ip: string): Promise<void> {
    const token = await this.setupTokenRepository.findByToken(data.setupToken);
    if (!token) {
      throw new UnauthorizedException('Invalid setup token');
    }

    if (token.isUsed) {
      throw new UnauthorizedException('Setup token has already been used');
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException('Setup token has expired');
    }

    await this.setupTokenRepository.createAuditEntry({
      tokenId: token.id,
      action: SetupAuditAction.SETUP_ATTEMPTED,
      ip,
      success: true,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        // Create admin user
        const user = await tx.user.create({
          data: {
            email: data.email,
            password: data.password, // Note: Should be hashed by auth service
            firstName: data.firstName,
            lastName: data.lastName,
          },
        });

        // Assign system admin role
        await tx.systemRole.create({
          data: {
            name: 'SYSTEM_ADMIN',
            description: 'System Administrator',
            permissions: ['*'], // All permissions
            users: {
              connect: { id: user.id },
            },
          },
        });

        // Mark token as used
        await this.setupTokenRepository.markAsUsed(token.id, ip);

        await this.setupTokenRepository.createAuditEntry({
          tokenId: token.id,
          action: SetupAuditAction.SETUP_COMPLETED,
          ip,
          success: true,
          metadata: { userId: user.id },
        });
      });
    } catch (error: unknown) {
      await this.setupTokenRepository.createAuditEntry({
        tokenId: token.id,
        action: SetupAuditAction.SETUP_COMPLETED,
        ip,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new BadRequestException('Failed to complete setup');
    }
  }

  /**
   * Check if system setup is required
   */
  async isSetupRequired(): Promise<boolean> {
    const adminCount = await this.prisma.systemRole.count({
      where: { name: 'SYSTEM_ADMIN' },
    });
    return adminCount === 0;
  }

  /**
   * Validate a setup token
   * @param token Token to validate
   * @param ip IP address validating the token
   */
  async validateToken(token: string, ip: string): Promise<boolean> {
    const setupToken = await this.setupTokenRepository.findByToken(token);
    if (!setupToken) {
      return false;
    }

    if (setupToken.isUsed || setupToken.expiresAt < new Date()) {
      return false;
    }

    await this.setupTokenRepository.createAuditEntry({
      tokenId: setupToken.id,
      action: SetupAuditAction.TOKEN_GENERATED,
      ip,
      success: true,
    });

    return true;
  }
}
