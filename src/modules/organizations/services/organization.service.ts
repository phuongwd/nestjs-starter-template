import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { Organization, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IOrganizationRepository } from '../interfaces/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../constants/injection-tokens';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  /**
   * Create a new organization and assign the creator as org_admin
   * @throws {ConflictException} If organization with slug already exists
   * @throws {InternalServerErrorException} If system roles are not properly initialized
   */
  async create(
    createOrganizationDto: CreateOrganizationDto,
    userId: number,
  ): Promise<Organization> {
    try {
      // First find the org_admin role to ensure it exists before creating organization
      const orgAdminRole = await this.prisma.role.findFirst({
        where: {
          name: 'org_admin',
          isSystemRole: true,
        },
      });

      if (!orgAdminRole) {
        this.logger.error(
          'Required system role org_admin not found during organization creation',
        );
        throw new InternalServerErrorException(
          'System is not properly initialized. Please contact support.',
        );
      }

      // Create the organization within a transaction
      return await this.prisma.$transaction(async (tx) => {
        // Create the organization
        const organization = await tx.organization.create({
          data: {
            ...createOrganizationDto,
            members: {
              create: {
                userId,
                status: 'ACTIVE',
                email: '', // Will be populated from user's email
              },
            },
          },
        });

        // Create the member role association
        await tx.memberRole.create({
          data: {
            member: {
              connect: {
                organizationId_userId: {
                  organizationId: organization.id,
                  userId,
                },
              },
            },
            role: {
              connect: {
                id: orgAdminRole.id,
              },
            },
          },
        });

        // Return the complete organization with members and roles
        return tx.organization.findUniqueOrThrow({
          where: { id: organization.id },
          include: {
            members: {
              include: {
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Error creating organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'An organization with this slug already exists',
          );
        }
      }

      // Re-throw InternalServerErrorException if it's our custom error
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // For any other unexpected errors
      throw new InternalServerErrorException(
        'An error occurred while creating the organization',
      );
    }
  }

  /**
   * Find all organizations where the user is an active member
   * @param userId The ID of the user
   * @returns Array of organizations where the user is an active member
   */
  async findAll(userId: number): Promise<Organization[]> {
    try {
      this.logger.debug(`Finding organizations for user: ${userId}`);
      const organizations =
        await this.organizationRepository.findAllByMember(userId);
      this.logger.debug(
        `Found ${organizations.length} organizations for user ${userId}`,
      );
      return organizations;
    } catch (error) {
      this.logger.error(
        `Error finding organizations for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Find one organization by ID
   */
  async findOne(id: number, _userId: number): Promise<Organization> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return organization;
  }

  /**
   * Update an organization
   */
  async update(
    id: number,
    updateOrganizationDto: UpdateOrganizationDto,
    userId: number,
  ): Promise<Organization> {
    await this.verifyUserIsAdmin(id, userId);

    try {
      return this.organizationRepository.update(id, updateOrganizationDto);
    } catch (error) {
      this.logger.error(
        `Error updating organization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete an organization
   */
  async remove(id: number, userId: number): Promise<void> {
    await this.verifyUserIsAdmin(id, userId);

    try {
      await this.organizationRepository.delete(id);
    } catch (error) {
      this.logger.error(
        `Error deleting organization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        status: 'ACTIVE',
        roles: {
          some: {
            role: {
              name: 'org_admin',
            },
          },
        },
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'You must be an organization admin to perform this action',
      );
    }
  }
}
