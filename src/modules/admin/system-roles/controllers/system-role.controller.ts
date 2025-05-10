import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SystemRoleService } from '../services/system-role.service';
import { CreateSystemRoleDto } from '../dto/create-system-role.dto';
import { SystemRole } from '@prisma/client';
import { SystemAdminGuard } from '../guards/system-admin.guard';
import { RequireSystemRole } from '@/modules/admin/shared/decorators/system-role.decorator';

@ApiTags('System Roles')
@ApiBearerAuth()
@Controller('admin/system-roles')
@UseGuards(SystemAdminGuard)
export class SystemRoleController {
  constructor(private readonly systemRoleService: SystemRoleService) {}

  @Post()
  @RequireSystemRole('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Create a new system role' })
  @ApiResponse({
    status: 201,
    description: 'The role has been created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 409,
    description: 'Role with this name already exists.',
  })
  async create(@Body() createDto: CreateSystemRoleDto): Promise<SystemRole> {
    return this.systemRoleService.createRole(createDto);
  }

  @Get()
  @RequireSystemRole('SYSTEM_AUDITOR')
  @ApiOperation({ summary: 'Get all system roles' })
  @ApiResponse({ status: 200, description: 'List of all system roles.' })
  async findAll(): Promise<SystemRole[]> {
    return this.systemRoleService.getAllRoles();
  }

  @Get(':id')
  @RequireSystemRole('SYSTEM_AUDITOR')
  @ApiOperation({ summary: 'Get a system role by ID' })
  @ApiResponse({ status: 200, description: 'The found role.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SystemRole> {
    return this.systemRoleService.getRoleById(id);
  }

  @Post(':roleId/users/:userId')
  @RequireSystemRole('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a system role to a user' })
  @ApiResponse({ status: 204, description: 'Role assigned successfully.' })
  @ApiResponse({ status: 404, description: 'Role or user not found.' })
  async assignToUser(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    await this.systemRoleService.assignRoleToUser(userId, roleId);
  }

  @Delete(':roleId/users/:userId')
  @RequireSystemRole('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a system role from a user' })
  @ApiResponse({ status: 204, description: 'Role removed successfully.' })
  @ApiResponse({ status: 404, description: 'Role or user not found.' })
  async removeFromUser(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    await this.systemRoleService.removeRoleFromUser(userId, roleId);
  }

  @Delete(':id')
  @RequireSystemRole('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a system role' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.systemRoleService.deleteRole(id);
  }
}
