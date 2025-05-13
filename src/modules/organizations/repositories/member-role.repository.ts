import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { IMemberRoleRepository } from '../interfaces/member-role.repository.interface';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Repository for managing member roles with tenant awareness and monitoring
 */
@Injectable()
export class MemberRoleRepository
  extends BaseRepository<MemberRole>
  implements IMemberRoleRepository
{
  protected readonly logger = new Logger(MemberRoleRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'memberRole');
  }

  protected isTenantAware(): boolean {
    return true;
  }

  /**
   * Assign roles to a member by role names, handling lookup and assignment
   */
  async assignRolesByNames(
    memberId: number,
    roleNames: string[],
    organizationId: number,
  ): Promise<void> {
    return this.withTenantContext(async () => {
      // Get roles by names
      const roles = await this.prisma.role.findMany({
        where: {
          OR: [
            { name: { in: roleNames }, organizationId },
            { name: { in: roleNames }, isSystemRole: true },
          ],
        },
      });

      // Verify all roles were found
      const foundRoleNames = roles.map((role) => role.name);
      const missingRoles = roleNames.filter(
        (name) => !foundRoleNames.includes(name),
      );
      if (missingRoles.length > 0) {
        throw new BadRequestException(
          `Invalid role names: ${missingRoles.join(', ')}`,
        );
      }

      // Delete existing role assignments
      await this.prisma.memberRole.deleteMany({
        where: { memberId },
      });

      // Create new role assignments
      await this.prisma.memberRole.createMany({
        data: roles.map((role) => ({ memberId, roleId: role.id })),
      });
    });
  }

  /**
   * Assign roles to a member
   */
  async assignRoles(memberId: number, roleIds: number[]): Promise<void> {
    return this.withTenantContext(async () => {
      // Delete existing role assignments
      await this.prisma.memberRole.deleteMany({
        where: { memberId },
      });

      // Create new role assignments
      await this.prisma.memberRole.createMany({
        data: roleIds.map((roleId) => ({
          ...this.applyTenantContext({ memberId, roleId }),
        })),
      });
    });
  }

  /**
   * Get roles for a member
   */
  async getRoles(memberId: number): Promise<MemberRole[]> {
    return this.withTenantContext(async () => {
      return this.prisma.memberRole.findMany({
        where: this.applyTenantContext({ memberId }),
        include: {
          role: true,
        },
      });
    });
  }

  /**
   * Check if member has specific role
   */
  async hasRole(memberId: number, roleName: string): Promise<boolean> {
    return this.withTenantContext(async () => {
      const count = await this.prisma.memberRole.count({
        where: this.applyTenantContext({
          memberId,
          role: {
            name: roleName,
          },
        }),
      });
      return count > 0;
    });
  }

  /**
   * Remove all roles from a member
   */
  async removeAllRoles(memberId: number): Promise<void> {
    return this.withTenantContext(async () => {
      await this.prisma.memberRole.deleteMany({
        where: { memberId },
      });
    });
  }

  /**
   * Remove specific role from a member
   */
  async removeRole(memberId: number, roleId: number): Promise<void> {
    return this.withTenantContext(async () => {
      await this.prisma.memberRole.deleteMany({
        where: { memberId, roleId },
      });
    });
  }

  /**
   * Find members by role
   */
  async findMembersByRole(
    organizationId: number,
    roleName: string,
  ): Promise<MemberRole[]> {
    return this.withTenantContext(async () => {
      return this.prisma.memberRole.findMany({
        where: this.applyTenantContext({
          member: {
            organizationId,
          },
          role: {
            name: roleName,
          },
        }),
        include: {
          member: {
            include: {
              user: true,
            },
          },
          role: true,
        },
      });
    });
  }
}
