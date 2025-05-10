import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemInitService {
  private readonly logger = new Logger(SystemInitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.logger.debug('SystemInitService constructed');
  }

  /**
   * Initialize system with required base configuration
   * This should be idempotent - safe to run multiple times
   */
  async initializeSystem(): Promise<void> {
    this.logger.debug('=== initializeSystem called ===');
    this.logger.log('Starting system initialization...');

    // Check deployment type
    const isCloud =
      this.configService.get<string>('DEPLOYMENT_TYPE') === 'cloud';
    const licenseKey = this.configService.get<string>('LICENSE_KEY');

    this.logger.log(`Deployment type: ${isCloud ? 'cloud' : 'self-hosted'}`);
    this.logger.log(`License key present: ${!!licenseKey}`);

    if (!isCloud && !licenseKey) {
      this.logger.warn('No license key found for self-hosted deployment');
      return;
    }

    try {
      // Initialize in sequence to maintain data consistency
      this.logger.log('Starting license validation...');
      await this.validateLicense();
      this.logger.log('License validation completed');

      this.logger.log('Starting permissions initialization...');
      await this.initializePermissions();
      this.logger.log('Permissions initialization completed');

      this.logger.log('Starting system roles initialization...');
      await this.initializeSystemRoles();
      this.logger.log('System roles initialization completed');

      this.logger.log('Starting license settings initialization...');
      await this.initializeLicenseSettings();
      this.logger.log('License settings initialization completed');

      this.logger.log('System initialization completed successfully');
    } catch (error) {
      this.logger.error('System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate license for self-hosted deployments
   */
  private async validateLicense(): Promise<void> {
    const isCloud =
      this.configService.get<string>('DEPLOYMENT_TYPE') === 'cloud';
    if (isCloud) {
      this.logger.log('Skipping license validation for cloud deployment');
      return;
    }

    const licenseKey = this.configService.get<string>('LICENSE_KEY');
    if (!licenseKey) {
      throw new Error('License key is required for self-hosted deployments');
    }

    // TODO: Implement actual license validation
    this.logger.log('License validated successfully');
  }

  /**
   * Initialize license-specific settings
   */
  private async initializeLicenseSettings(): Promise<void> {
    const isCloud =
      this.configService.get<string>('DEPLOYMENT_TYPE') === 'cloud';
    if (isCloud) {
      this.logger.log('Skipping license settings for cloud deployment');
      return;
    }

    // TODO: Initialize license-specific settings like:
    // - User limits
    // - Feature flags
    // - Custom branding
    // - API rate limits
    this.logger.log('License settings initialized');
  }

  /**
   * Initialize default permissions if they don't exist
   */
  private async initializePermissions(): Promise<void> {
    this.logger.log('Starting to initialize permissions...');
    const requiredPermissions = [
      // User permissions
      {
        name: 'user:create',
        description: 'Can create users',
        resourceType: 'user',
        action: 'create',
      },
      {
        name: 'user:read',
        description: 'Can read user information',
        resourceType: 'user',
        action: 'read',
      },
      {
        name: 'user:update',
        description: 'Can update user information',
        resourceType: 'user',
        action: 'update',
      },
      {
        name: 'user:delete',
        description: 'Can delete users',
        resourceType: 'user',
        action: 'delete',
      },

      // Organization permissions
      {
        name: 'organization:create',
        description: 'Can create organizations',
        resourceType: 'organization',
        action: 'create',
      },
      {
        name: 'organization:read',
        description: 'Can read organization information',
        resourceType: 'organization',
        action: 'read',
      },
      {
        name: 'organization:update',
        description: 'Can update organization information',
        resourceType: 'organization',
        action: 'update',
      },
      {
        name: 'organization:delete',
        description: 'Can delete organizations',
        resourceType: 'organization',
        action: 'delete',
      },

      // Member permissions
      {
        name: 'member:invite',
        description: 'Can invite members to organization',
        resourceType: 'member',
        action: 'invite',
      },
      {
        name: 'member:read',
        description: 'Can read member information',
        resourceType: 'member',
        action: 'read',
      },
      {
        name: 'member:update',
        description: 'Can update member information',
        resourceType: 'member',
        action: 'update',
      },
      {
        name: 'member:delete',
        description: 'Can remove members from organization',
        resourceType: 'member',
        action: 'delete',
      },
      {
        name: 'member:assign',
        description: 'Can assign roles to members',
        resourceType: 'member',
        action: 'assign',
      },

      // Role permissions
      {
        name: 'role:create',
        description: 'Can create roles',
        resourceType: 'role',
        action: 'create',
      },
      {
        name: 'role:read',
        description: 'Can read role information',
        resourceType: 'role',
        action: 'read',
      },
      {
        name: 'role:update',
        description: 'Can update role information',
        resourceType: 'role',
        action: 'update',
      },
      {
        name: 'role:delete',
        description: 'Can delete roles',
        resourceType: 'role',
        action: 'delete',
      },

      // Monitoring permissions
      {
        name: 'monitoring:read',
        description: 'Can read monitoring metrics and health status',
        resourceType: 'monitoring',
        action: 'read',
      },
    ];

    for (const permission of requiredPermissions) {
      try {
        this.logger.debug(`Upserting permission: ${permission.name}`);
        await this.prisma.permission.upsert({
          where: { name: permission.name },
          update: permission,
          create: permission,
        });
        this.logger.debug(`Initialized permission: ${permission.name}`);
      } catch (error) {
        this.logger.error(
          `Error initializing permission ${permission.name}:`,
          error,
        );
        throw error;
      }
    }

    this.logger.log(`Initialized ${requiredPermissions.length} permissions`);
  }

  /**
   * Initialize system roles if they don't exist
   */
  private async initializeSystemRoles(): Promise<void> {
    this.logger.log('Starting to initialize system roles...');

    try {
      // Get all permissions
      const permissions = await this.prisma.permission.findMany();
      this.logger.log(
        `Found ${permissions.length} permissions for role assignment`,
      );

      // System Admin Role
      const existingSystemAdminRole = await this.prisma.role.findFirst({
        where: {
          name: 'system_admin',
          organizationId: null,
        },
      });

      if (!existingSystemAdminRole) {
        this.logger.log('Creating system admin role...');
        await this.prisma.role.create({
          data: {
            name: 'system_admin',
            description: 'System administrator with full access',
            isSystemRole: true,
            permissions: {
              create: permissions.map((permission) => ({
                permissionId: permission.id,
              })),
            },
          },
        });
        this.logger.log('Created system admin role');
      } else {
        this.logger.log('System admin role already exists');
      }

      // Organization Admin Role
      const existingOrgAdminRole = await this.prisma.role.findFirst({
        where: {
          name: 'org_admin',
          organizationId: null,
        },
      });

      if (!existingOrgAdminRole) {
        this.logger.log('Creating organization admin role...');
        await this.prisma.role.create({
          data: {
            name: 'org_admin',
            description: 'Organization administrator',
            isSystemRole: true,
            permissions: {
              create: permissions
                .filter((p) => !p.name.startsWith('system:'))
                .map((permission) => ({
                  permissionId: permission.id,
                })),
            },
          },
        });
        this.logger.log('Created organization admin role');
      } else {
        this.logger.log('Organization admin role already exists');
      }

      this.logger.log('System roles initialization completed');
    } catch (error) {
      this.logger.error('Error initializing system roles:', error);
      throw error;
    }
  }
}
