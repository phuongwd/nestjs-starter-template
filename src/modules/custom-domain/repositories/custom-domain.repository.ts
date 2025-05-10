import { Injectable, Logger } from '@nestjs/common';
import { CustomDomain, DomainStatus, Prisma } from '@prisma/client';
import { BaseRepository } from '@shared/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { ICustomDomainRepository } from '../interfaces/custom-domain.repository.interface';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * Repository implementation for custom domain operations
 * Extends BaseRepository for common functionality and implements
 * ICustomDomainRepository for type safety and contract enforcement
 */
@Injectable()
export class CustomDomainRepository
  extends BaseRepository<CustomDomain>
  implements ICustomDomainRepository
{
  protected readonly logger = new Logger(CustomDomainRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'CustomDomain');
  }

  /**
   * @inheritdoc
   */
  protected isTenantAware(): boolean {
    return true; // Custom domains are organization-specific
  }

  /**
   * @inheritdoc
   */
  protected getIncludeRelations(): Prisma.CustomDomainInclude {
    return {
      sslCertificate: true,
    };
  }

  /**
   * Safely handle database operations with error handling for missing tables
   * @param operation The database operation to execute
   * @param errorMessage The error message to log if the operation fails
   * @param defaultValue The default value to return if the table doesn't exist
   */
  private async safeExecuteQuery<T>(
    operation: () => Promise<T>,
    _errorMessage: string,
    defaultValue: T,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      // Handle missing table errors gracefully
      if (
        error instanceof PrismaClientKnownRequestError &&
        (error.code === 'P2021' || // Table does not exist
          error.code === 'P2010' || // Raw query failed
          error.code === 'P2003') // Foreign key constraint failed
      ) {
        this.logger.warn(`Database schema error: ${error.message}`);
        return defaultValue;
      }

      // Log other database errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Database operation failed for CustomDomain: ${errorMessage}`,
      );

      // Use the parent class error handling or throw a generic error
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async findById(id: number): Promise<CustomDomain | null> {
    return this.safeExecuteQuery(
      async () => {
        return this.prisma.customDomain.findUnique({
          where: { id },
          include: this.getIncludeRelations(),
        });
      },
      'Failed to find custom domain by ID',
      null,
    );
  }

  /**
   * @inheritdoc
   */
  async findByDomain(domain: string): Promise<CustomDomain | null> {
    return this.safeExecuteQuery(
      async () => {
        return this.prisma.customDomain.findUnique({
          where: { domain },
          include: this.getIncludeRelations(),
        });
      },
      'Failed to find custom domain by domain name',
      null,
    );
  }

  /**
   * @inheritdoc
   */
  async findByOrganization(organizationId: number): Promise<CustomDomain[]> {
    return this.safeExecuteQuery(
      async () => {
        return this.prisma.customDomain.findMany({
          where: { organizationId },
          include: this.getIncludeRelations(),
          orderBy: { createdAt: 'desc' },
        });
      },
      'Failed to find custom domains for organization',
      [],
    );
  }

  /**
   * @inheritdoc
   */
  async create(data: {
    domain: string;
    organizationId: number;
    verificationToken: string;
  }): Promise<CustomDomain> {
    return this.safeExecuteQuery(
      async () => {
        return this.prisma.customDomain.create({
          data: {
            ...data,
            status: DomainStatus.PENDING,
          },
          include: this.getIncludeRelations(),
        });
      },
      'Failed to create custom domain',
      // Return a temporary object if table doesn't exist
      {
        id: -1,
        domain: data.domain,
        organizationId: data.organizationId,
        verificationToken: data.verificationToken,
        status: DomainStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        verifiedAt: null,
        sslCertificate: null,
      } as CustomDomain,
    );
  }

  /**
   * @inheritdoc
   */
  async updateStatus(
    id: number,
    status: DomainStatus,
    verifiedAt?: Date,
    data?: Prisma.CustomDomainUpdateInput,
  ): Promise<CustomDomain> {
    return this.safeExecuteQuery(
      async () => {
        return this.prisma.customDomain.update({
          where: { id },
          data: {
            status,
            verifiedAt,
            ...data,
          },
          include: this.getIncludeRelations(),
        });
      },
      'Failed to update custom domain status',
      // Return a temporary object if table doesn't exist
      {
        id,
        domain: 'unknown',
        organizationId: -1,
        verificationToken: null,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
        verifiedAt,
        sslCertificate: null,
      } as CustomDomain,
    );
  }

  /**
   * @inheritdoc
   */
  async delete(id: number): Promise<void> {
    await this.safeExecuteQuery(
      async () => {
        await this.prisma.customDomain.delete({
          where: { id },
        });
        return undefined;
      },
      'Failed to delete custom domain',
      undefined,
    );
  }

  /**
   * @inheritdoc
   */
  async countByOrganization(organizationId: number): Promise<number> {
    return this.safeExecuteQuery(
      async () => {
        return this.prisma.customDomain.count({
          where: { organizationId },
        });
      },
      'Failed to count custom domains for organization',
      0,
    );
  }

  /**
   * @inheritdoc
   */
  async findAll(): Promise<CustomDomain[]> {
    return this.safeExecuteQuery(
      async () => {
        return this.prisma.customDomain.findMany({
          include: this.getIncludeRelations(),
        });
      },
      'Failed to find all custom domains',
      [],
    );
  }
}
