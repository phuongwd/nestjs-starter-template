import { Prisma } from '@prisma/client';
import { MemberWithRelations } from '../types/member.types';
import { MemberFilterDto } from '../dto/member-filter.dto';

/**
 * Interface for member repository operations
 */
export interface IMemberRepository {
  /**
   * Find a member by ID with all relations
   */
  findById(id: number): Promise<MemberWithRelations | null>;

  /**
   * Find a member by organization ID and user ID
   */
  findByOrgAndUser(
    organizationId: number,
    userId: number,
  ): Promise<MemberWithRelations | null>;

  /**
   * Find members by organization ID with pagination and filtering
   */
  findByOrganization(
    organizationId: number,
    filter?: MemberFilterDto,
  ): Promise<{ items: MemberWithRelations[]; total: number }>;

  /**
   * Create a new member
   */
  create(
    data: Prisma.OrganizationMemberCreateInput,
  ): Promise<MemberWithRelations>;

  /**
   * Update a member
   */
  update(
    id: number,
    data: Prisma.OrganizationMemberUpdateInput,
  ): Promise<MemberWithRelations>;

  /**
   * Delete a member
   */
  delete(id: number): Promise<void>;

  /**
   * Get member count for organization
   */
  getMemberCount(organizationId: number): Promise<number>;

  /**
   * Check if a member exists
   */
  exists(
    organizationId: number,
    criteria: { userId?: number; email?: string },
  ): Promise<boolean>;

  /**
   * Find members with admin role
   */
  findAdmins(organizationId: number): Promise<MemberWithRelations[]>;

  /**
   * Check if a member is an admin
   */
  isAdmin(organizationId: number, userId: number): Promise<boolean>;

  /**
   * Find members with a specific role
   */
  findMembersByRole(
    organizationId: number,
    roleName: string,
  ): Promise<MemberWithRelations[]>;
}
