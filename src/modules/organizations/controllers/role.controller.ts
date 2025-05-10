import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { RequirePermissions } from '@/shared/decorators/require-permissions.decorator';
import {
  RESOURCE_TYPES,
  ACTIONS,
  DEFAULT_PERMISSIONS,
} from '@/modules/permissions/constants/permission.constants';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RoleService } from '../services/role.service';
import { PermissionGuard } from '@/shared/guards/permission.guard';
import { RoleResponseDto } from '../dto/role.response.dto';
import { GroupedPermissions, Permission } from '../types/role.types';
import { OrganizationId } from '@/shared/decorators/organization-context.decorator';
import { ORGANIZATION_HEADER } from '@/shared/constants';

@ApiTags('Organization Roles')
@Controller('roles')
@UseGuards(PermissionGuard)
@ApiHeader({
  name: ORGANIZATION_HEADER,
  description: 'The ID of the organization',
  required: true,
})
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(private readonly roleService: RoleService) {}

  @Get('permissions')
  @RequirePermissions({
    resource: RESOURCE_TYPES.ROLE,
    action: ACTIONS.READ,
  })
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({
    status: 200,
    description: 'List of all available permissions grouped by resource',
    schema: {
      example: {
        subscription: {
          name: 'Subscription',
          permissions: [
            {
              name: 'subscription:view',
              description: 'Can view subscription information',
              resourceType: 'subscription',
              action: 'view',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async getAvailablePermissions(): Promise<GroupedPermissions> {
    // Group permissions by resource type
    const groupedPermissions = DEFAULT_PERMISSIONS.reduce((acc, permission) => {
      const { resourceType, ...rest } = permission;

      if (!acc[resourceType]) {
        acc[resourceType] = {
          name: this.formatResourceName(resourceType),
          permissions: [],
        };
      }

      acc[resourceType].permissions.push({
        ...rest,
        resourceType,
      } as Permission);

      return acc;
    }, {} as GroupedPermissions);

    return groupedPermissions;
  }

  private formatResourceName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  @Post()
  @RequirePermissions({
    resource: RESOURCE_TYPES.ROLE,
    action: ACTIONS.CREATE,
  })
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async createRole(
    @OrganizationId() organizationId: number,
    @Body() createRoleDto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    this.logger.log(
      `Creating role ${createRoleDto.name} for organization ${organizationId}`,
    );
    return this.roleService.createRole(organizationId, createRoleDto);
  }

  @Get()
  @RequirePermissions({
    resource: RESOURCE_TYPES.ROLE,
    action: ACTIONS.READ,
  })
  @ApiOperation({ summary: 'Get all roles for organization' })
  @ApiResponse({
    status: 200,
    description: 'List of all roles',
    type: [RoleResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async getRoles(
    @OrganizationId() organizationId: number,
  ): Promise<RoleResponseDto[]> {
    return this.roleService.getRoles(organizationId);
  }

  @Get(':roleId')
  @RequirePermissions({
    resource: RESOURCE_TYPES.ROLE,
    action: ACTIONS.READ,
  })
  @ApiOperation({ summary: 'Get role details' })
  @ApiResponse({
    status: 200,
    description: 'Role details',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async getRole(
    @OrganizationId() organizationId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<RoleResponseDto> {
    return this.roleService.getRole(organizationId, roleId);
  }

  @Put(':roleId/permissions')
  @RequirePermissions({
    resource: RESOURCE_TYPES.ROLE,
    action: ACTIONS.UPDATE,
  })
  @ApiOperation({ summary: 'Update role permissions' })
  @ApiResponse({
    status: 200,
    description: 'Role permissions updated',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async updateRolePermissions(
    @OrganizationId() organizationId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() { permissions }: { permissions: string[] },
  ): Promise<RoleResponseDto> {
    this.logger.log(
      `Updating permissions for role ${roleId} in organization ${organizationId}`,
    );
    return this.roleService.updateRolePermissions(
      organizationId,
      roleId,
      permissions,
    );
  }

  @Delete(':roleId')
  @RequirePermissions({
    resource: RESOURCE_TYPES.ROLE,
    action: ACTIONS.DELETE,
  })
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  async deleteRole(
    @OrganizationId() organizationId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<void> {
    this.logger.log(
      `Deleting role ${roleId} from organization ${organizationId}`,
    );
    return this.roleService.deleteRole(organizationId, roleId);
  }
}
