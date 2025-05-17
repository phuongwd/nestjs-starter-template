import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { IPendingRegistrationRepository } from '../interfaces/pending-registration.repository.interface';
import { PendingRegistrations } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Repository for managing pending registrations with tenant awareness and monitoring
 */
@Injectable()
export class PendingRegistrationRepository
  extends BaseRepository<PendingRegistrations>
  implements IPendingRegistrationRepository
{
  protected readonly logger = new Logger(PendingRegistrationRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'pendingRegistration');
  }

  protected isTenantAware(): boolean {
    return true;
  }

  /**
   * Create a new pending registration
   */
  async create(data: {
    email: string;
    organizationId: number;
    invitationToken: string;
    roleNames: string[];
  }): Promise<PendingRegistrations> {
    return this.withTenantContext(async () => {
      return this.prisma.pendingRegistrations.create({
        data: {
          ...this.applyTenantContext(data),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    });
  }

  /**
   * Find a pending registration by token
   */
  async findByToken(
    email: string,
    invitationToken: string,
  ): Promise<PendingRegistrations | null> {
    return this.withTenantContext(async () => {
      const registration = await this.prisma.pendingRegistrations.findFirst({
        where: this.applyTenantContext({
          email,
          invitationToken,
        }),
        include: {
          organization: true,
        },
      });

      if (registration && registration.expiresAt < new Date()) {
        await this.delete(registration.id);
        return null;
      }

      return registration;
    });
  }

  /**
   * Delete a pending registration
   */
  async delete(id: number): Promise<void> {
    await this.withTenantContext(async () => {
      await this.prisma.pendingRegistrations.delete({
        where: this.applyTenantContext({ id }),
      });
    });
  }

  /**
   * Find expired registrations
   */
  async findExpired(): Promise<PendingRegistrations[]> {
    return this.withTenantContext(async () => {
      return this.prisma.pendingRegistrations.findMany({
        where: this.applyTenantContext({
          expiresAt: {
            lt: new Date(),
          },
        }),
      });
    });
  }

  /**
   * Clean up expired registrations
   */
  async cleanupExpired(): Promise<number> {
    return this.withTenantContext(async () => {
      const result = await this.prisma.pendingRegistrations.deleteMany({
        where: this.applyTenantContext({
          expiresAt: {
            lt: new Date(),
          },
        }),
      });
      return result.count;
    });
  }
}
