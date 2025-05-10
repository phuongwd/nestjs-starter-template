import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { Organization, Prisma } from '@prisma/client';
import { IOrganizationRepository } from '../interfaces/organization.repository.interface';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Repository for managing organizations with tenant awareness and monitoring
 */
@Injectable()
export class OrganizationRepository
  extends BaseRepository<Organization>
  implements IOrganizationRepository
{
  protected readonly logger = new Logger(OrganizationRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'organization');
  }

  protected isTenantAware(): boolean {
    return true;
  }

  /**
   * Find organization by ID
   */
  async findById(id: number): Promise<Organization | null> {
    return this.withTenantContext(async () => {
      return this.prisma.organization.findUnique({
        where: this.applyTenantContext({ id }),
      });
    });
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.withTenantContext(async () => {
      return this.prisma.organization.findUnique({
        where: this.applyTenantContext({ slug }),
      });
    });
  }

  /**
   * Find all organizations
   */
  async findAll(): Promise<Organization[]> {
    return this.withTenantContext(async () => {
      return this.prisma.organization.findMany({
        where: this.applyTenantContext({}) as Prisma.OrganizationWhereInput,
      });
    });
  }

  /**
   * Create a new organization
   */
  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return this.withTenantContext(async () => {
      return this.prisma.organization.create({
        data: this.applyTenantContext(data),
      });
    });
  }

  /**
   * Update an organization
   */
  async update(
    id: number,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<Organization> {
    return this.withTenantContext(async () => {
      return this.prisma.organization.update({
        where: this.applyTenantContext({ id }),
        data,
      });
    });
  }

  /**
   * Delete an organization
   */
  async delete(id: number): Promise<void> {
    await this.withTenantContext(async () => {
      await this.prisma.organization.delete({
        where: this.applyTenantContext({ id }),
      });
    });
  }

  /**
   * Find all organizations where the user is an active member
   * @param userId The ID of the user
   * @returns Array of organizations where the user is an active member
   */
  async findAllByMember(userId: number): Promise<Organization[]> {
    return this.withTenantContext(async () => {
      return this.prisma.organization.findMany({
        where: {
          members: {
            some: {
              userId,
              status: 'ACTIVE',
            },
          },
        },
        include: {
          members: {
            where: {
              userId,
              status: 'ACTIVE',
            },
            include: {
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      });
    });
  }
}
