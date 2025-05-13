import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IEmailService } from '@/modules/email/interfaces/email-service.interface';
import { EMAIL_TOKENS } from '@/modules/email/constants/injection-tokens';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { BulkInviteMembersDto } from '../dto/bulk-invite-members.dto';
import { MemberFilterDto } from '../dto/member-filter.dto';
import { SubscriptionService } from '../../subscriptions/services/subscription.service';
import { v4 as uuidv4 } from 'uuid';
import { MemberStatus, MemberWithRelations } from '../types/member.types';
import { IMemberRepository } from '../interfaces/member.repository.interface';
import { IMemberActivityRepository } from '../interfaces/member-activity.repository.interface';
import { IPendingRegistrationRepository } from '../interfaces/pending-registration.repository.interface';
import { IMemberRoleRepository } from '../interfaces/member-role.repository.interface';
import {
  MEMBER_REPOSITORY,
  MEMBER_ACTIVITY_REPOSITORY,
  PENDING_REGISTRATION_REPOSITORY,
  MEMBER_ROLE_REPOSITORY,
} from '../constants/injection-tokens';
import {
  ActivityMetadata,
  ACTIVITY_TYPES,
} from '../types/activity-metadata.types';
import { ACTIVITY_ACTIONS } from '../constants/activity.constants';
import { MemberCacheService } from './member-cache.service';
import { OrganizationPermissionService } from './organization-permission.service';
import { Permission } from '@prisma/client';
import { EmailUser } from '../../email/types/email.types';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_TOKENS.SERVICE) private readonly emailService: IEmailService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepository: IMemberRepository,
    @Inject(MEMBER_ACTIVITY_REPOSITORY)
    private readonly memberActivityRepository: IMemberActivityRepository,
    @Inject(PENDING_REGISTRATION_REPOSITORY)
    private readonly pendingRegistrationRepository: IPendingRegistrationRepository,
    @Inject(MEMBER_ROLE_REPOSITORY)
    private readonly memberRoleRepository: IMemberRoleRepository,
    private readonly memberCacheService: MemberCacheService,
    private readonly organizationPermissionService: OrganizationPermissionService,
  ) {}

  /**
   * Convert a user object to EmailUser, ensuring non-null name fields
   */
  private toEmailUser(user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }): EmailUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User',
    };
  }

  /**
   * Invite a new member to the organization
   */
  async inviteMember(
    organizationId: number,
    inviterUserId: number,
    dto: InviteMemberDto,
  ): Promise<MemberWithRelations> {
    // Check member limit
    await this.subscriptionService.checkMemberLimit(organizationId);

    // Check if member already exists
    const exists = await this.memberRepository.exists(organizationId, {
      email: dto.email,
    });

    if (exists) {
      throw new ConflictException('Member already exists in this organization');
    }

    // Get inviter details for email
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterUserId },
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    // Get organization details for email
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const invitationToken = uuidv4();
    const roleNames = dto.roleNames || [];

    if (existingUser) {
      // Create member with invitation token
      const member = await this.memberRepository.create({
        organization: { connect: { id: organizationId } },
        user: { connect: { id: existingUser.id } },
        email: dto.email,
        status: MemberStatus.INVITED,
        invitationToken,
      });

      // Assign roles
      await this.assignRoles(member.id, roleNames);

      // Send invitation email
      await this.emailService.sendMemberInvitation(
        organization,
        dto.email,
        this.toEmailUser(inviter),
        invitationToken,
        dto.customMessage,
      );

      // Track activity
      await this.memberActivityRepository.trackActivity(
        organizationId,
        member.id,
        ACTIVITY_ACTIONS.MEMBER_INVITED,
        {
          type: ACTIVITY_TYPES.MEMBER_INVITATION,
          timestamp: new Date().toISOString(),
          invitedBy: inviterUserId,
          email: dto.email,
          roles: dto.roleNames || [],
        },
      );

      return member;
    } else {
      // Create pending registration
      await this.pendingRegistrationRepository.create({
        email: dto.email,
        organizationId,
        invitationToken,
        roleNames,
      });

      // Send registration invitation email
      await this.emailService.sendRegistrationInvitation(
        organization,
        dto.email,
        this.toEmailUser(inviter),
        invitationToken,
        dto.customMessage,
      );

      // Create member with pending registration status
      const member = await this.memberRepository.create({
        organization: { connect: { id: organizationId } },
        email: dto.email,
        status: MemberStatus.PENDING_REGISTRATION,
        invitationToken,
      });

      // Track activity
      await this.memberActivityRepository.trackActivity(
        organizationId,
        member.id,
        ACTIVITY_ACTIONS.REGISTRATION_INVITATION_SENT,
        {
          type: ACTIVITY_TYPES.MEMBER_INVITATION,
          timestamp: new Date().toISOString(),
          invitedBy: inviterUserId,
          email: dto.email,
          roles: roleNames,
        },
      );

      return member;
    }
  }

  /**
   * Get all members of an organization
   */
  async getMembers(organizationId: number): Promise<MemberWithRelations[]> {
    try {
      // Try to get from cache first
      const cachedMembers =
        await this.memberCacheService.getCachedOrgMembers(organizationId);
      if (cachedMembers) {
        this.logger.debug(
          `Cache hit for organization ${organizationId} members`,
        );
        return cachedMembers.items;
      }

      // If not in cache, get from database with pagination
      const result = await this.memberRepository.findByOrganization(
        organizationId,
        {
          page: 1,
          limit: 100, // Use a reasonable limit for caching
        },
      );

      // Cache the results and permissions
      await Promise.all([
        this.memberCacheService.cacheOrgMembers(organizationId, result),
        ...result.items.map(async (member) => {
          if (member.userId) {
            await this.organizationPermissionService.cachePermissions(
              member.userId,
              organizationId,
              member,
            );
          }
        }),
      ]);

      return result.items;
    } catch (error) {
      this.logger.error(
        `Error getting members for organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get a specific member by ID
   */
  async getMember(
    organizationId: number,
    memberId: number,
  ): Promise<MemberWithRelations> {
    try {
      // Get member from database to get userId
      const member = await this.memberRepository.findById(memberId);
      if (!member) {
        throw new NotFoundException('Member not found');
      }

      if (!member.userId) {
        throw new NotFoundException('Member has no associated user');
      }

      // Try to get from cache first
      const [cachedMember, cachedPermisson] = await Promise.all([
        this.memberCacheService.getCachedMember(member.userId, organizationId),
        this.organizationPermissionService.getPermissions(
          member.userId,
          organizationId,
        ),
      ]);

      if (cachedMember) {
        this.logger.debug(`Cache hit for member ${memberId}`);
        if (cachedPermisson.length === 0) {
          await this.organizationPermissionService.cachePermissions(
            member.userId,
            organizationId,
            member,
          );
        }
        return cachedMember;
      }

      // Cache the member data and permissions
      this.logger.debug(`Cache miss for member ${memberId}. Apply cache now`);
      await Promise.all([
        this.memberCacheService.cacheMember(
          member.userId,
          organizationId,
          member,
        ),
        this.organizationPermissionService.cachePermissions(
          member.userId,
          organizationId,
          member,
        ),
      ]);

      return member;
    } catch (error) {
      this.logger.error(
        `Error getting member ${memberId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Update a member's status and roles
   */
  async updateMember(
    organizationId: number,
    memberId: number,
    updaterUserId: number,
    dto: UpdateMemberDto,
  ): Promise<MemberWithRelations> {
    try {
      // Get existing member to check status and get userId
      const existingMember = await this.memberRepository.findById(memberId);
      if (!existingMember) {
        throw new NotFoundException('Member not found');
      }

      // Update member
      const updatedMember = await this.memberRepository.update(memberId, dto);

      // Invalidate caches
      if (existingMember.userId) {
        await this.memberCacheService.invalidateMemberCache(
          existingMember.userId,
          organizationId,
        );
      }
      await this.memberCacheService.invalidateOrgMembersCache(organizationId);

      // Log activity
      await this.memberActivityRepository.trackActivity(
        organizationId,
        memberId,
        ACTIVITY_ACTIONS.UPDATE,
        {
          type: ACTIVITY_TYPES.MEMBER_UPDATE,
          timestamp: new Date().toISOString(),
          updatedBy: updaterUserId,
          changes: Object.fromEntries(
            Object.entries(dto).filter(([_, value]) => value !== undefined),
          ),
        },
      );

      return updatedMember;
    } catch (error) {
      this.logger.error(
        `Error updating member ${memberId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { memberId, organizationId, error },
      );
      throw error;
    }
  }

  /**
   * Remove a member from the organization
   */
  async removeMember(
    organizationId: number,
    memberId: number,
    removerUserId: number,
  ): Promise<void> {
    try {
      // Get member to check if it exists and get userId
      const member = await this.memberRepository.findById(memberId);
      if (!member) {
        throw new NotFoundException('Member not found');
      }

      // Check if this is the last admin
      const isLastAdmin = await this.isLastAdmin(organizationId, memberId);
      if (isLastAdmin) {
        throw new ForbiddenException(
          'Cannot remove the last admin from the organization',
        );
      }

      // Get member roles before deletion for activity tracking
      const roles = member.roles?.map((role) => role.role.name) || [];

      // Remove member
      await this.memberRepository.delete(memberId);

      // Invalidate caches
      if (member.userId) {
        await this.memberCacheService.invalidateMemberCache(
          member.userId,
          organizationId,
        );
      }
      await this.memberCacheService.invalidateOrgMembersCache(organizationId);

      // Log activity
      await this.memberActivityRepository.trackActivity(
        organizationId,
        memberId,
        ACTIVITY_ACTIONS.REMOVE,
        {
          type: ACTIVITY_TYPES.MEMBER_REMOVAL,
          timestamp: new Date().toISOString(),
          removedBy: removerUserId,
          memberEmail: member.email,
          roles,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error removing member ${memberId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { memberId, organizationId, error },
      );

      // Re-throw specific errors
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // For other errors, throw a generic error to avoid exposing internals
      throw new Error('Failed to remove member from organization');
    }
  }

  /**
   * Accept an invitation to join an organization
   */
  async acceptInvitation(
    organizationId: number,
    userId: number,
  ): Promise<MemberWithRelations> {
    // Find the member with invitation
    const member = await this.memberRepository.findByOrgAndUser(
      organizationId,
      userId,
    );

    if (!member || member.status !== MemberStatus.INVITED) {
      throw new NotFoundException('Invitation not found');
    }

    // Update member status
    const updatedMember = await this.memberRepository.update(member.id, {
      status: MemberStatus.ACTIVE,
      invitationToken: null,
    });

    // Find admin for notification
    const admins = await this.memberRepository.findAdmins(organizationId);
    const admin = admins[0];

    if (admin?.user && member.user) {
      // Send notification to admin using the helper method
      await this.emailService.sendInvitationAcceptedNotification(
        member.organization,
        this.toEmailUser(member.user),
        this.toEmailUser(admin.user),
      );
    }

    // Track activity
    await this.memberActivityRepository.trackActivity(
      organizationId,
      member.id,
      ACTIVITY_ACTIONS.INVITATION_ACCEPTED,
      {
        type: ACTIVITY_TYPES.INVITATION_RESPONSE,
        timestamp: new Date().toISOString(),
        respondedBy: userId,
        accepted: true,
      },
    );

    return updatedMember;
  }

  async userRegisteredAcceptInvitation(
    invitationToken: string,
    userId: number,
    email: string,
  ): Promise<MemberWithRelations | undefined> {
    const member = await this.memberRepository.findByInvitationToken(
      invitationToken,
      email,
    );

    if (!member) {
      throw new NotFoundException('Invitation not found');
    }

    const { organizationId } = member;

    if (!member || member.status !== MemberStatus.PENDING_REGISTRATION) {
      throw new NotFoundException('Invitation not found');
    }

    // Update member status
    const updatedMember = await this.memberRepository.update(member.id, {
      status: MemberStatus.ACTIVE,
      invitationToken: null,
      user: { connect: { id: userId } },
    });

    // Find admin for notification
    const admins = await this.memberRepository.findAdmins(organizationId);
    const admin = admins[0];

    if (admin?.user && member.user) {
      // Send notification to admin using the helper method
      await this.emailService.sendInvitationAcceptedNotification(
        member.organization,
        this.toEmailUser(member.user),
        this.toEmailUser(admin.user),
      );
    }

    // Track activity
    await this.memberActivityRepository.trackActivity(
      organizationId,
      member.id,
      ACTIVITY_ACTIONS.INVITATION_ACCEPTED,
      {
        type: ACTIVITY_TYPES.INVITATION_RESPONSE,
        timestamp: new Date().toISOString(),
        respondedBy: userId,
        accepted: true,
      },
    );

    return updatedMember;
  }

  /**
   * Decline an invitation to join an organization
   */
  async declineInvitation(
    organizationId: number,
    userId: number,
  ): Promise<void> {
    // Find the member with invitation
    const member = await this.memberRepository.findByOrgAndUser(
      organizationId,
      userId,
    );

    if (!member || member.status !== MemberStatus.INVITED) {
      throw new NotFoundException('Invitation not found');
    }

    // Delete the member
    await this.memberRepository.delete(member.id);

    // Track activity
    await this.memberActivityRepository.trackActivity(
      organizationId,
      member.id,
      ACTIVITY_ACTIONS.INVITATION_DECLINED,
      {
        type: ACTIVITY_TYPES.INVITATION_RESPONSE,
        timestamp: new Date().toISOString(),
        respondedBy: userId,
        accepted: false,
      },
    );
  }

  /**
   * Assign roles to a member
   */
  async assignRoles(memberId: number, roleNames: string[]): Promise<void> {
    const member = await this.memberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    await this.memberRoleRepository.assignRolesByNames(
      memberId,
      roleNames,
      member.organizationId,
    );

    // Invalidate cache
    if (member.userId) {
      await this.memberCacheService.invalidateMemberCache(
        member.userId,
        member.organizationId,
      );
    }
    await this.memberCacheService.invalidateOrgMembersCache(
      member.organizationId,
    );
  }

  /**
   * Check if a member is the last admin of an organization
   */
  private async isLastAdmin(
    organizationId: number,
    memberId: number,
  ): Promise<boolean> {
    try {
      const admins = await this.memberRepository.findAdmins(organizationId);
      const member = await this.memberRepository.findById(memberId);

      if (!member) {
        return false;
      }

      const isAdmin = member.roles.some(
        (role) => role.role.name === 'org_admin',
      );
      return admins.length === 1 && isAdmin;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to check if member ${memberId} is last admin in organization ${organizationId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Verify that a user is an admin of the organization
   */
  private async verifyUserIsAdmin(
    organizationId: number,
    userId: number,
  ): Promise<void> {
    const isAdmin = await this.memberRepository.isAdmin(organizationId, userId);

    if (!isAdmin) {
      throw new ForbiddenException(
        'You must be an organization admin to perform this action',
      );
    }
  }

  /**
   * Bulk invite members to the organization
   */
  async bulkInviteMembers(
    organizationId: number,
    inviterUserId: number,
    dto: BulkInviteMembersDto,
  ): Promise<MemberWithRelations[]> {
    try {
      // Verify inviter has permission
      await this.verifyUserIsAdmin(organizationId, inviterUserId);

      // Check member limit for each invitation
      await this.subscriptionService.checkMemberLimit(organizationId);

      // Get inviter details for email
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterUserId },
      });

      if (!inviter) {
        throw new NotFoundException('Inviter not found');
      }

      // Get organization details for email
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      const invitedMembers: MemberWithRelations[] = [];

      // Process each invitation
      for (const invitation of dto.invitations) {
        // Check if member already exists
        const exists = await this.memberRepository.exists(organizationId, {
          email: invitation.email,
        });

        if (exists) {
          this.logger.warn(
            `Member with email ${invitation.email} already exists in organization ${organizationId}`,
          );
          continue;
        }

        const invitationToken = uuidv4();
        const roleNames = invitation.roleNames || [];

        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
          where: { email: invitation.email },
        });

        if (existingUser) {
          // Create member with invitation token
          const member = await this.memberRepository.create({
            organization: { connect: { id: organizationId } },
            user: { connect: { id: existingUser.id } },
            email: invitation.email,
            status: MemberStatus.INVITED,
            invitationToken,
          });

          // Assign roles
          await this.assignRoles(member.id, roleNames);

          // Send invitation email
          await this.emailService.sendMemberInvitation(
            organization,
            invitation.email,
            this.toEmailUser(inviter),
            invitationToken,
            invitation.customMessage,
          );

          // Track activity
          await this.memberActivityRepository.trackActivity(
            organizationId,
            member.id,
            ACTIVITY_ACTIONS.MEMBER_INVITED,
            {
              type: ACTIVITY_TYPES.MEMBER_INVITATION,
              timestamp: new Date().toISOString(),
              invitedBy: inviterUserId,
              email: invitation.email,
              roles: roleNames,
            },
          );

          invitedMembers.push(member);
        } else {
          // Create pending registration
          await this.pendingRegistrationRepository.create({
            email: invitation.email,
            organizationId,
            invitationToken,
            roleNames,
          });

          // Send registration invitation email
          await this.emailService.sendRegistrationInvitation(
            organization,
            invitation.email,
            this.toEmailUser(inviter),
            invitationToken,
            invitation.customMessage,
          );

          // Create member with pending registration status
          const member = await this.memberRepository.create({
            organization: { connect: { id: organizationId } },
            email: invitation.email,
            status: MemberStatus.PENDING_REGISTRATION,
            invitationToken,
          });

          // Track activity
          await this.memberActivityRepository.trackActivity(
            organizationId,
            member.id,
            ACTIVITY_ACTIONS.REGISTRATION_INVITATION_SENT,
            {
              type: ACTIVITY_TYPES.MEMBER_INVITATION,
              timestamp: new Date().toISOString(),
              invitedBy: inviterUserId,
              email: invitation.email,
              roles: roleNames,
            },
          );

          invitedMembers.push(member);
        }
      }

      // Invalidate organization members cache after bulk invite
      await this.memberCacheService.invalidateOrgMembersCache(organizationId);

      return invitedMembers;
    } catch (error) {
      this.logger.error(
        `Error bulk inviting members to organization ${organizationId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Get member activities
   */
  async getMemberActivities(
    organizationId: number,
    memberId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    activities: Array<{
      id: number;
      organizationId: number;
      memberId: number;
      action: string;
      metadata: ActivityMetadata | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.memberActivityRepository.getActivities(
      organizationId,
      memberId,
      page,
      limit,
    );
  }

  /**
   * Find members with filtering
   */
  async findMembers(
    organizationId: number,
    filter: MemberFilterDto,
  ): Promise<{
    members: MemberWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.memberRepository.findByOrganization(
      organizationId,
      filter,
    );

    return {
      members: result.items,
      total: result.total,
      page: filter.page || 1,
      totalPages: Math.ceil(result.total / (filter.limit || 10)),
    };
  }

  /**
   * Complete registration for a pending member
   */
  async completeRegistration(
    email: string,
    invitationToken: string,
    userId: number,
  ): Promise<MemberWithRelations> {
    // Find pending registration
    const registration = await this.pendingRegistrationRepository.findByToken(
      email,
      invitationToken,
    );

    if (!registration) {
      throw new NotFoundException('Invalid or expired registration token');
    }

    // Get organization details
    const organization = await this.prisma.organization.findUnique({
      where: { id: registration.organizationId },
      include: {
        members: {
          where: { roles: { some: { role: { name: 'org_admin' } } } },
          include: { user: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Update member status and link user
    const member = await this.memberRepository.update(registration.id, {
      status: MemberStatus.ACTIVE,
      user: { connect: { id: userId } },
      invitationToken: null,
    });

    // Assign roles from pending registration
    await this.assignRoles(member.id, registration.roleNames);

    // Delete pending registration
    await this.pendingRegistrationRepository.delete(registration.id);

    // Track activity
    await this.memberActivityRepository.trackActivity(
      member.organizationId,
      member.id,
      ACTIVITY_ACTIONS.REGISTRATION_COMPLETED,
      {
        type: ACTIVITY_TYPES.REGISTRATION_COMPLETION,
        timestamp: new Date().toISOString(),
        email,
        completedBy: userId,
      },
    );

    // Notify organization admin
    const admin = organization.members[0]?.user;
    if (admin) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        await this.emailService.sendRegistrationCompletedNotification(
          organization,
          this.toEmailUser(user),
          this.toEmailUser(admin),
        );
      }
    }

    return member;
  }

  /**
   * Find member by ID
   */
  async findById(memberId: number): Promise<MemberWithRelations> {
    // Try to get from cache first
    const member = await this.memberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    if (member.userId) {
      await this.memberCacheService.cacheMember(
        member.userId,
        member.organizationId,
        member,
      );
    }

    return member;
  }

  /**
   * Find members by organization ID
   */
  async findByOrganization(
    organizationId: number,
  ): Promise<MemberWithRelations[]> {
    try {
      // Try to get from cache first
      const cachedMembers =
        await this.memberCacheService.getCachedOrgMembers(organizationId);
      if (cachedMembers) {
        this.logger.debug(
          `Cache hit for organization ${organizationId} members`,
        );
        return cachedMembers.items;
      }

      // If not in cache, get from database with pagination
      const result = await this.memberRepository.findByOrganization(
        organizationId,
        {
          page: 1,
          limit: 100, // Use a reasonable limit for caching
        },
      );

      // Cache the results
      await this.memberCacheService.cacheOrgMembers(organizationId, result);

      return result.items;
    } catch (error) {
      this.logger.error(
        `Error getting members for organization ${organizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Check if a member has a specific permission
   */
  async hasPermission(
    organizationId: number,
    memberId: number,
    permission: Permission,
  ): Promise<boolean> {
    try {
      const member = await this.getMember(organizationId, memberId);
      if (!member.userId) {
        return false;
      }

      return this.organizationPermissionService.hasPermission(
        member.userId,
        organizationId,
        permission,
      );
    } catch (error) {
      this.logger.error(
        `Error checking permission for member ${memberId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Update member roles and invalidate cached permissions
   */
  async updateMemberRoles(
    organizationId: number,
    memberId: number,
    roleNames: string[],
  ): Promise<void> {
    try {
      const member = await this.getMember(organizationId, memberId);
      if (!member.userId) {
        throw new NotFoundException('Member has no associated user');
      }

      // Update roles in database
      await this.assignRoles(memberId, roleNames);

      // Invalidate cached permissions
      await this.organizationPermissionService.invalidatePermissions(
        member.userId,
        organizationId,
      );

      this.logger.debug(
        `Updated roles and invalidated permissions for member ${memberId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating member roles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
