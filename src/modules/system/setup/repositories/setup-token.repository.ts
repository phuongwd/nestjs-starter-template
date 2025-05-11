import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SetupToken, SetupAudit, Prisma } from '@prisma/client';
import {
  ISetupTokenRepository,
  CreateSetupTokenData,
  CreateSetupAuditData,
} from '../interfaces/setup-token.interface';

/**
 * Setup token repository implementation
 * @description Handles setup token and audit persistence
 */
@Injectable()
export class SetupTokenRepository implements ISetupTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new setup token
   * @param data Token creation data
   */
  async createToken(data: CreateSetupTokenData): Promise<SetupToken> {
    const createData: Prisma.SetupTokenCreateInput = {
      token: data.token,
      expiresAt: data.expiresAt,
      createdByIp: data.createdByIp,
      environment: data.environment,
      fingerprint: data.fingerprint,
      metadata: data.metadata as Prisma.InputJsonValue,
      isUsed: false,
    };

    return this.prisma.$transaction(async (tx) => {
      return tx.setupToken.create({
        data: createData,
      });
    });
  }

  /**
   * Find a token by its value
   * @param token Token string to find
   */
  async findByToken(token: string): Promise<SetupToken | null> {
    return this.prisma.$transaction(async (tx) => {
      return tx.setupToken.findUnique({
        where: { token },
      });
    });
  }

  /**
   * Mark a token as used
   * @param id Token ID
   * @param usedByIp IP address that used the token
   * @param tx Optional Prisma transaction client
   */
  async markAsUsed(
    id: string,
    usedByIp: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SetupToken> {
    const updateData: Prisma.SetupTokenUpdateInput = {
      isUsed: true,
      usedAt: new Date(),
      usedByIp,
    };

    // Use the provided transaction client if available, otherwise use the main prisma client
    const client = tx || this.prisma;
    return client.setupToken.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Create an audit entry for a token
   * @param data Audit entry data
   * @param tx Optional Prisma transaction client
   */
  async createAuditEntry(
    data: CreateSetupAuditData,
    tx?: Prisma.TransactionClient,
  ): Promise<SetupAudit> {
    const createData: Prisma.SetupAuditCreateInput = {
      token: { connect: { id: data.tokenId } },
      action: data.action,
      ip: data.ip,
      success: data.success,
      error: data.error,
      metadata: data.metadata as Prisma.InputJsonValue,
      timestamp: new Date(),
    };

    // Use the provided transaction client if available, otherwise use the main prisma client
    const client = tx || this.prisma;
    return client.setupAudit.create({
      data: createData,
    });
  }
}
