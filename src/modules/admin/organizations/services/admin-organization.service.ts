import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { IOrganizationRepository } from '@/modules/organizations/interfaces/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '@/modules/organizations/constants/injection-tokens';
import { Inject } from '@nestjs/common';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';
import { AdminAuditService } from '../../audit/services/admin-audit.service';
import { RequestWithUser } from '@/modules/auth/types/user.types';

/**
 * Service for handling organization operations by system administrators
 * Provides CRUD operations and advanced management features
 * Uses the core organization repository with admin-level access
 */
@Injectable()
export class AdminOrganizationService {
  private readonly logger = new Logger(AdminOrganizationService.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  /**
   * Get all organizations in the system
   * Only accessible by system administrators
   * @returns Array of all organizations
   */
  async findAll(request: RequestWithUser): Promise<Organization[]> {
    try {
      const organizations = await this.organizationRepository.findAll();
      await this.adminAuditService.logActionFromRequest(
        request,
        'LIST_ORGANIZATIONS',
        'organization',
        undefined,
        { count: organizations.length },
      );
      return organizations;
    } catch (error) {
      this.logger.error(
        `Error finding all organizations: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve organizations',
      );
    }
  }

  /**
   * Get organization by ID
   * @param id Organization ID
   * @returns Organization details
   * @throws NotFoundException if organization not found
   */
  async findById(id: number, request: RequestWithUser): Promise<Organization> {
    try {
      const organization = await this.organizationRepository.findById(id);
      if (!organization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }
      await this.adminAuditService.logActionFromRequest(
        request,
        'VIEW_ORGANIZATION',
        'organization',
        id.toString(),
      );
      return organization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error finding organization by ID: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { id },
      );
      throw new InternalServerErrorException('Failed to retrieve organization');
    }
  }

  /**
   * Create a new organization
   * @param dto Organization creation data
   * @returns Created organization
   * @throws ConflictException if slug already exists
   */
  async create(
    dto: CreateOrganizationDto,
    request: RequestWithUser,
  ): Promise<Organization> {
    try {
      // Check if organization with slug exists
      const existing = await this.organizationRepository.findBySlug(dto.slug);
      if (existing) {
        throw new ConflictException(
          `Organization with slug ${dto.slug} already exists`,
        );
      }

      const organization = await this.organizationRepository.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      });

      await this.adminAuditService.logActionFromRequest(
        request,
        'CREATE_ORGANIZATION',
        'organization',
        organization.id.toString(),
        {
          name: organization.name,
          slug: organization.slug,
        },
      );

      return organization;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Error creating organization: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { dto },
      );
      throw new InternalServerErrorException('Failed to create organization');
    }
  }

  /**
   * Update an organization
   * @param id Organization ID
   * @param dto Update data
   * @returns Updated organization
   * @throws NotFoundException if organization not found
   */
  async update(
    id: number,
    dto: UpdateOrganizationDto,
    request: RequestWithUser,
  ): Promise<Organization> {
    try {
      // Check if organization exists
      const existing = await this.organizationRepository.findById(id);
      if (!existing) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      const organization = await this.organizationRepository.update(id, {
        name: dto.name,
        description: dto.description,
      });

      await this.adminAuditService.logActionFromRequest(
        request,
        'UPDATE_ORGANIZATION',
        'organization',
        id.toString(),
        { updates: dto },
      );

      return organization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating organization: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { id, dto },
      );
      throw new InternalServerErrorException('Failed to update organization');
    }
  }

  /**
   * Delete an organization
   * @param id Organization ID
   * @throws NotFoundException if organization not found
   */
  async delete(id: number, request: RequestWithUser): Promise<void> {
    try {
      // Check if organization exists
      const existing = await this.organizationRepository.findById(id);
      if (!existing) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      await this.organizationRepository.delete(id);
      await this.adminAuditService.logActionFromRequest(
        request,
        'DELETE_ORGANIZATION',
        'organization',
        id.toString(),
        { name: existing.name },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting organization: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { id },
      );
      throw new InternalServerErrorException('Failed to delete organization');
    }
  }
}
