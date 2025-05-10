import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminOrganizationService } from '../services/admin-organization.service';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';
import { RequireSystemRole } from '../../system-roles/decorators/require-system-role.decorator';
import { RequireAdminSession } from '../../sessions/decorators/require-admin-session.decorator';
import { RequestWithUser } from '@/modules/auth/types/user.types';

@ApiTags('Admin Organizations')
@ApiBearerAuth()
@Controller('admin/organizations')
@UseGuards(JwtAuthGuard) // Layer 1: Authentication
@RequireSystemRole('SYSTEM_ADMIN') // Layer 2: Role check
@RequireAdminSession() // Layer 3: Active session
export class AdminOrganizationController {
  constructor(
    private readonly adminOrganizationService: AdminOrganizationService,
  ) {}

  /**
   * Get all organizations in the system
   * Only accessible by system administrators
   */
  @Get()
  @ApiOperation({ summary: 'Get all organizations (System Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Returns all organizations in the system.',
  })
  findAll(@Req() request: RequestWithUser) {
    return this.adminOrganizationService.findAll(request);
  }

  /**
   * Get organization by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID (System Admin)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the organization details.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.adminOrganizationService.findById(id, request);
  }

  /**
   * Create a new organization
   */
  @Post()
  @ApiOperation({ summary: 'Create new organization (System Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully.',
  })
  @ApiResponse({
    status: 409,
    description: 'Organization with this slug already exists.',
  })
  create(@Body() dto: CreateOrganizationDto, @Req() request: RequestWithUser) {
    return this.adminOrganizationService.create(dto, request);
  }

  /**
   * Update organization details
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update organization (System Admin)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDto,
    @Req() request: RequestWithUser,
  ) {
    return this.adminOrganizationService.update(id, dto, request);
  }

  /**
   * Delete an organization
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization (System Admin)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.adminOrganizationService.delete(id, request);
  }
}
