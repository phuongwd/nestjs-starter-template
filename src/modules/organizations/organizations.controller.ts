import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationService } from './services/organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
} from '../../shared/decorators/require-permissions.decorator';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrganizationsController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @CanCreate('organization')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @GetUser() user: User,
  ) {
    return this.organizationService.create(createOrganizationDto, user.id);
  }

  /**
   * Get all organizations
   */
  @Get()
  @RequirePermissions({ resource: 'organizations', action: 'read' })
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({
    status: 200,
    description: 'Returns all organizations the user has access to.',
  })
  findAll(@GetUser() user: User) {
    return this.organizationService.findAll(user.id);
  }

  @Get(':id')
  @CanRead('organization')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns organization details',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.organizationService.findOne(+id, user.id);
  }

  @Patch(':id')
  @CanUpdate('organization')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions or not organization admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser() user: User,
  ) {
    return this.organizationService.update(+id, updateOrganizationDto, user.id);
  }

  @Delete(':id')
  @CanDelete('organization')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions or not organization admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.organizationService.remove(+id, user.id);
  }
}
