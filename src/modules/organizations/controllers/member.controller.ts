import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MemberService } from '../services/member.service';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
  RequirePermissions,
} from '../../../shared/decorators/require-permissions.decorator';
import { GetUser } from '../../../shared/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { BulkInviteMembersDto } from '../dto/bulk-invite-members.dto';
import { MemberFilterDto } from '../dto/member-filter.dto';
import { MemberWithRelations } from '../types/member.types';
import {
  MemberResponse,
  MemberListResponse,
  MemberActivityListResponse,
} from '../types/member.response';
import { OrganizationId } from '@/shared/decorators/organization-context.decorator';
import { ORGANIZATION_HEADER } from '@/shared/constants';
import {
  ACTIONS,
  RESOURCE_TYPES,
} from '@/modules/permissions/constants/permission.constants';

@ApiTags('Organization Members')
@ApiBearerAuth()
@Controller('members')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiHeader({
  name: ORGANIZATION_HEADER,
  description: 'The ID of the organization',
  required: true,
})
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post()
  @RequirePermissions({
    resource: RESOURCE_TYPES.MEMBER,
    action: ACTIONS.INVITE,
  })
  @ApiOperation({ summary: 'Invite a new member to the organization' })
  @ApiResponse({
    status: 201,
    description: 'Member invited successfully',
    type: MemberResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid data or member limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  inviteMember(
    @OrganizationId() organizationId: number,
    @Body() inviteMemberDto: InviteMemberDto,
    @GetUser() user: User,
  ): Promise<MemberWithRelations> {
    return this.memberService.inviteMember(
      organizationId,
      user.id,
      inviteMemberDto,
    );
  }

  @Get()
  @CanRead('member')
  @ApiOperation({ summary: 'Get all members of the organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns all organization members',
    type: MemberListResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  @ApiQuery({ type: MemberFilterDto })
  async findMembers(
    @OrganizationId() organizationId: number,
    @Query() filter: MemberFilterDto,
  ): Promise<{
    members: MemberWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.memberService.findMembers(organizationId, filter);
  }

  @Get(':id')
  @CanRead('member')
  @ApiOperation({ summary: 'Get member by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns member details',
    type: MemberResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  @ApiParam({
    name: 'id',
    description: 'Member ID',
    type: 'number',
  })
  getMember(
    @OrganizationId() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MemberWithRelations> {
    return this.memberService.getMember(organizationId, id);
  }

  @Get(':id/activities')
  @CanRead('member')
  @ApiOperation({ summary: 'Get member activities' })
  @ApiResponse({
    status: 200,
    description: 'Returns member activities',
    type: MemberActivityListResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  getMemberActivities(
    @OrganizationId() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.memberService.getMemberActivities(
      organizationId,
      id,
      page,
      limit,
    );
  }

  @Patch(':id')
  @CanUpdate('member')
  @ApiOperation({ summary: 'Update member' })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully',
    type: MemberResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  updateMember(
    @OrganizationId() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: UpdateMemberDto,
    @GetUser() user: User,
  ): Promise<MemberWithRelations> {
    return this.memberService.updateMember(
      organizationId,
      id,
      user.id,
      updateMemberDto,
    );
  }

  @Delete(':id')
  @CanDelete('member')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or last admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  removeMember(
    @OrganizationId() organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<void> {
    return this.memberService.removeMember(organizationId, id, user.id);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept organization invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    type: MemberResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  acceptInvitation(
    @OrganizationId() organizationId: number,
    @GetUser() user: User,
  ): Promise<MemberWithRelations> {
    return this.memberService.acceptInvitation(organizationId, user.id);
  }

  @Post('invitations/decline')
  @ApiOperation({ summary: 'Decline organization invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation declined successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  declineInvitation(
    @OrganizationId() organizationId: number,
    @GetUser() user: User,
  ): Promise<void> {
    return this.memberService.declineInvitation(organizationId, user.id);
  }

  @Post('bulk-invite')
  @CanCreate('member')
  @ApiOperation({ summary: 'Bulk invite members to the organization' })
  @ApiResponse({
    status: 201,
    description: 'Members invited successfully',
    type: [MemberResponse],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Member limit exceeded or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing organization context or invalid authentication',
  })
  bulkInviteMembers(
    @OrganizationId() organizationId: number,
    @Body() bulkInviteMembersDto: BulkInviteMembersDto,
    @GetUser() user: User,
  ): Promise<MemberWithRelations[]> {
    return this.memberService.bulkInviteMembers(
      organizationId,
      user.id,
      bulkInviteMembersDto,
    );
  }

  @Get('test')
  @ApiOperation({ summary: 'Health check endpoint for smoke testing' })
  @ApiResponse({
    status: 200,
    description: 'Member controller is healthy',
  })
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
