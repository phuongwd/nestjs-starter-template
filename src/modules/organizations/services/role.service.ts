import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RoleResponseDto } from '../dto/role.response.dto';
import { Role, RolePermission } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transform a role with its permissions to RoleResponseDto format
   */
  private transformToRoleResponse(
    role: Role & {
      permissions: (RolePermission & {
        permission: {
          id: number;
          name: string;
          description: string | null;
          resourceType: string;
          action: string;
        };
      })[];
    },
  ): RoleResponseDto {
    return {
      ...role,
      description: role.description || undefined,
      organizationId: role.organizationId || 0,
      permissions: role.permissions.map((rp) => ({
        ...rp.permission,
        description: rp.permission.description || '',
        resourceType: rp.permission.resourceType,
        action: rp.permission.action,
      })),
    };
  }

  /**
   * Create a new role for an organization
   */
  async createRole(
    organizationId: number,
    createRoleDto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException(`Organization #${organizationId} not found`);
    }

    // Check if role name already exists in organization
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: createRoleDto.name,
        organizationId,
      },
    });
    if (existingRole) {
      throw new ConflictException(
        `Role with name ${createRoleDto.name} already exists in this organization`,
      );
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        name: {
          in: createRoleDto.permissions,
        },
      },
    });

    if (permissions.length !== createRoleDto.permissions.length) {
      const foundPermissionNames = permissions.map((p) => p.name);
      const invalidPermissions = createRoleDto.permissions.filter(
        (p) => !foundPermissionNames.includes(p),
      );
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}`,
      );
    }

    // Create role with permissions
    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        organizationId,
        permissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return this.transformToRoleResponse(role);
  }

  /**
   * Get all roles for an organization
   */
  async getRoles(organizationId: number): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        organizationId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => this.transformToRoleResponse(role));
  }

  /**
   * Get a specific role
   */
  async getRole(
    organizationId: number,
    roleId: number,
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return this.transformToRoleResponse(role);
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    organizationId: number,
    roleId: number,
    permissionNames: string[],
  ): Promise<RoleResponseDto> {
    // Verify role exists and belongs to organization
    const role = await this.getRole(organizationId, roleId);

    // Check if it's a system role
    if (role.isSystemRole) {
      throw new BadRequestException('Cannot modify system role permissions');
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        name: {
          in: permissionNames,
        },
      },
    });

    if (permissions.length !== permissionNames.length) {
      const foundPermissionNames = permissions.map((p) => p.name);
      const invalidPermissions = permissionNames.filter(
        (p) => !foundPermissionNames.includes(p),
      );
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}`,
      );
    }

    // Update role permissions
    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          deleteMany: {}, // Remove all existing permissions
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return this.transformToRoleResponse(updatedRole);
  }

  /**
   * Delete a role
   */
  async deleteRole(organizationId: number, roleId: number): Promise<void> {
    // Verify role exists and belongs to organization
    const role = await this.getRole(organizationId, roleId);

    if (role.isSystemRole) {
      throw new BadRequestException('Cannot delete system roles');
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });
  }
}
