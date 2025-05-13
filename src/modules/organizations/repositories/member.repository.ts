import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { MemberWithRelations, MemberStatus } from '../types/member.types';
import { IMemberRepository } from '../interfaces/member.repository.interface';
import { Prisma } from '@prisma/client';
import { MemberFilterDto } from '../dto/member-filter.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROLE_NAMES } from '../constants/role.constants';
import { MemberWithRoles } from '../types/member.types';

/**
 * Repository for managing organization members with tenant awareness and monitoring
 */
@Injectable()
export class MemberRepository
  extends BaseRepository<MemberWithRelations>
  implements IMemberRepository
{
  protected readonly logger = new Logger(MemberRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'organizationMember');
  }

  protected isTenantAware(): boolean {
    return true;
  }

  protected getIncludeRelations(): Prisma.OrganizationMemberInclude {
    return {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      organization: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Find a member by ID with all relations
   */
  async findById(id: number): Promise<MemberWithRelations | null> {
    return this.withTenantContext(async () => {
      const result = await this.prisma.organizationMember.findFirst({
        where: this.applyTenantContext({ id }),
        include: this.getIncludeRelations(),
      });
      return result as unknown as MemberWithRelations | null;
    });
  }

  /**
   * Find a member by organization ID and user ID
   */
  async findByOrgAndUser(
    organizationId: number,
    userId: number,
  ): Promise<MemberWithRelations | null> {
    return this.withTenantContext(async () => {
      const result = await this.prisma.organizationMember.findFirst({
        where: this.applyTenantContext({
          organizationId,
          userId,
        }),
        include: this.getIncludeRelations(),
      });
      return result as unknown as MemberWithRelations | null;
    });
  }

  /**
   * Find members by organization ID with pagination and filtering
   */
  async findByOrganization(
    organizationId: number,
    filter: MemberFilterDto,
  ): Promise<{ items: MemberWithRelations[]; total: number }> {
    const { page = 1, limit = 10, status, search, role } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationMemberWhereInput = {
      ...this.applyTenantContext({ organizationId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
      ...(role && {
        roles: {
          some: {
            role: {
              name: role,
            },
          },
        },
      }),
    };

    return this.withTenantContext(async () => {
      const [items, total] = await Promise.all([
        this.prisma.organizationMember.findMany({
          where,
          include: this.getIncludeRelations(),
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.organizationMember.count({ where }),
      ]);

      return {
        items: items as unknown as MemberWithRelations[],
        total,
      };
    });
  }

  /**
   * Create a new member
   */
  async create(
    data: Prisma.OrganizationMemberCreateInput,
  ): Promise<MemberWithRelations> {
    return this.withTenantContext(async () => {
      const result = await this.prisma.organizationMember.create({
        data,
        include: this.getIncludeRelations(),
      });
      return result as unknown as MemberWithRelations;
    });
  }

  /**
   * Update a member
   */
  async update(
    id: number,
    data: Prisma.OrganizationMemberUpdateInput,
  ): Promise<MemberWithRelations> {
    return this.withTenantContext(async () => {
      const result = await this.prisma.organizationMember.update({
        where: this.applyTenantContext({ id }),
        data,
        include: this.getIncludeRelations(),
      });
      return result as unknown as MemberWithRelations;
    });
  }

  /**
   * Delete a member
   */
  async delete(id: number): Promise<void> {
    await this.withTenantContext(async () =>
      this.prisma.organizationMember.delete({
        where: this.applyTenantContext({ id }),
      }),
    );
  }

  /**
   * Get member count for organization
   */
  async getMemberCount(organizationId: number): Promise<number> {
    return this.withTenantContext(async () => {
      return this.prisma.organizationMember.count({
        where: this.applyTenantContext({
          organizationId,
          status: {
            in: [MemberStatus.ACTIVE, MemberStatus.INVITED],
          },
        }),
      });
    });
  }

  /**
   * Check if a member exists
   */
  async exists(
    organizationId: number,
    criteria: { userId?: number; email?: string },
  ): Promise<boolean> {
    return this.withTenantContext(async () => {
      const count = await this.prisma.organizationMember.count({
        where: this.applyTenantContext({
          organizationId,
          OR: [
            criteria.userId ? { userId: criteria.userId } : {},
            criteria.email ? { email: criteria.email } : {},
          ],
        }),
      });
      return count > 0;
    });
  }

  /**
   * Find members with admin role
   */
  async findAdmins(organizationId: number): Promise<MemberWithRelations[]> {
    return this.withTenantContext(async () => {
      const results = await this.prisma.organizationMember.findMany({
        where: this.applyTenantContext({
          organizationId,
          status: MemberStatus.ACTIVE,
          roles: {
            some: {
              role: {
                name: ROLE_NAMES.ORG_ADMIN,
              },
            },
          },
        }),
        include: this.getIncludeRelations(),
      });
      return results as unknown as MemberWithRelations[];
    });
  }

  /**
   * Check if a member is an admin
   */
  async isAdmin(organizationId: number, userId: number): Promise<boolean> {
    return this.withTenantContext(async () => {
      const count = await this.prisma.organizationMember.count({
        where: this.applyTenantContext({
          organizationId,
          userId,
          status: MemberStatus.ACTIVE,
          roles: {
            some: {
              role: {
                name: ROLE_NAMES.ORG_ADMIN,
              },
            },
          },
        }),
      });
      return count > 0;
    });
  }

  /**
   * Find members with a specific role
   */
  async findMembersByRole(
    organizationId: number,
    roleName: string,
  ): Promise<MemberWithRelations[]> {
    return this.withTenantContext(async () => {
      const results = await this.prisma.organizationMember.findMany({
        where: this.applyTenantContext({
          organizationId,
          status: MemberStatus.ACTIVE,
          roles: {
            some: {
              role: {
                name: roleName,
              },
            },
          },
        }),
        include: this.getIncludeRelations(),
      });
      return results as unknown as MemberWithRelations[];
    });
  }

  /**
   * Find members with optimized query for bulk operations
   */
  protected async findWithOptimization<T>(
    query: () => Promise<T>,
    options: {
      cacheKey?: string;
      timeout?: number;
      retryCount?: number;
    } = {},
  ): Promise<T> {
    const { timeout = 5000, retryCount = 3 } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout),
        );
        return (await Promise.race([query(), timeoutPromise])) as T;
      } catch (error: unknown) {
        lastError = error as Error;
        const err = error as Error;
        this.logger.warn(
          `Query attempt ${attempt} failed: ${err.message}`,
          err.stack,
        );
        if (attempt === retryCount) break;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError;
  }

  async findByOrganizationId(
    organizationId: number,
    filter: MemberFilterDto,
  ): Promise<MemberWithRoles[]> {
    const { search, sortBy = 'createdAt', sortDirection = 'desc' } = filter;

    const where: Prisma.OrganizationMemberWhereInput = {
      organizationId,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const orderBy: Prisma.OrganizationMemberOrderByWithRelationInput = {
      ...(sortBy === 'firstName' && { user: { firstName: sortDirection } }),
      ...(sortBy === 'lastName' && { user: { lastName: sortDirection } }),
      ...(sortBy === 'email' && { email: sortDirection }),
      ...(sortBy === 'status' && { status: sortDirection }),
      ...(sortBy === 'createdAt' && { createdAt: sortDirection }),
    };

    return this.prisma.organizationMember.findMany({
      where,
      orderBy,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        user: true,
      },
    }) as Promise<MemberWithRoles[]>;
  }
}
