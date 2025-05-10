import { Injectable, Logger } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateSystemRoleDto } from '../dto/create-system-role.dto';
import { ISystemRoleRepository } from '../interfaces/system-role.repository.interface';
import { BaseRepository } from '../../../../shared/repositories/base.repository';

/**
 * Repository implementation for system role operations
 */
@Injectable()
export class SystemRoleRepository
  extends BaseRepository<SystemRole>
  implements ISystemRoleRepository
{
  protected readonly logger = new Logger(SystemRoleRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'systemRole');
  }

  /**
   * System roles are not tenant-aware as they are global to the system
   */
  protected isTenantAware(): boolean {
    return false;
  }

  /**
   * Create a new system role
   */
  async create(data: CreateSystemRoleDto): Promise<SystemRole> {
    return this.executeQuery(
      () =>
        this.prisma.systemRole.create({
          data: {
            name: data.name,
            description: data.description,
            permissions: data.permissions,
          },
        }),
      'Failed to create system role',
    );
  }

  /**
   * Find a system role by ID
   */
  async findById(id: number): Promise<SystemRole | null> {
    return this.executeQuery(
      () =>
        this.prisma.systemRole.findUnique({
          where: { id },
        }),
      'Failed to find system role by ID',
    );
  }

  /**
   * Find a system role by name
   */
  async findByName(name: string): Promise<SystemRole | null> {
    return this.executeQuery(
      () =>
        this.prisma.systemRole.findUnique({
          where: { name },
        }),
      'Failed to find system role by name',
    );
  }

  /**
   * Find all system roles
   */
  async findAll(): Promise<SystemRole[]> {
    return this.executeQuery(
      () =>
        this.prisma.systemRole.findMany({
          orderBy: { name: 'asc' },
        }),
      'Failed to find all system roles',
    );
  }

  /**
   * Check if a user has a specific system role
   */
  async hasRole(userId: number, roleName: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const role = await this.prisma.systemRole.findFirst({
        where: {
          name: roleName,
          users: {
            some: {
              id: userId,
            },
          },
        },
      });
      return !!role;
    }, 'Failed to check user system role');
  }

  /**
   * Assign a system role to a user
   */
  async assignToUser(userId: number, roleId: number): Promise<void> {
    await this.executeQuery(
      () =>
        this.prisma.systemRole.update({
          where: { id: roleId },
          data: {
            users: {
              connect: { id: userId },
            },
          },
        }),
      'Failed to assign system role to user',
    );
  }

  /**
   * Remove a system role from a user
   */
  async removeFromUser(userId: number, roleId: number): Promise<void> {
    await this.executeQuery(
      () =>
        this.prisma.systemRole.update({
          where: { id: roleId },
          data: {
            users: {
              disconnect: { id: userId },
            },
          },
        }),
      'Failed to remove system role from user',
    );
  }

  /**
   * Delete a system role
   */
  async delete(id: number): Promise<void> {
    await this.executeQuery(
      () =>
        this.prisma.systemRole.delete({
          where: { id },
        }),
      'Failed to delete system role',
    );
  }
}
