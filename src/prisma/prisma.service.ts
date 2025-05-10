import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const logLevel = configService.get<string>('LOG_LEVEL');
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    super({
      log:
        logLevel === 'debug'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Connecting to database...');
      const startTime = Date.now();
      await this.$connect();
      const duration = Date.now() - startTime;
      this.logger.log(`Connected to database in ${duration}ms`);

      // Check and create custom_domains table if it doesn't exist
      await this.ensureCustomDomainsTable();
      // Check and create ssl_certificates table if it doesn't exist
      await this.ensureSslCertificatesTable();
      // Create default domain record for Render.com
      await this.ensureDefaultDomainRecord();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to connect to database:', errorMessage);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Disconnecting from database...');
      await this.$disconnect();
      this.logger.log('Disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    // Get all model names from PrismaClient instance
    const modelNames = Reflect.ownKeys(this).filter((key): key is string => {
      return typeof key === 'string' && !key.startsWith('_');
    });

    // Type assertion to ensure we only work with valid model keys
    return Promise.all(
      modelNames.map((modelKey) => {
        const model = this[modelKey as keyof PrismaService];
        if (model && typeof model === 'object' && 'deleteMany' in model) {
          return (model as { deleteMany: () => Promise<unknown> }).deleteMany();
        }
        return Promise.resolve();
      }),
    );
  }

  /**
   * Ensures the custom_domains table exists
   * This is a workaround for environments where migrations can't be run
   */
  private async ensureCustomDomainsTable() {
    try {
      // Check if the table exists by attempting a simple query
      await this.$queryRaw`SELECT 1 FROM "custom_domains" LIMIT 1`;
      this.logger.log('custom_domains table exists');
    } catch (error) {
      // Table doesn't exist, create it
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `custom_domains table does not exist (${errorMessage}), creating it...`,
      );
      try {
        // Create the table
        await this.$executeRaw`
          CREATE TABLE IF NOT EXISTS "custom_domains" (
            "id" SERIAL NOT NULL,
            "domain" TEXT NOT NULL,
            "organizationId" INTEGER NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "verificationToken" TEXT,
            "verifiedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
          )
        `;

        // Create unique index
        await this.$executeRaw`
          CREATE UNIQUE INDEX IF NOT EXISTS "custom_domains_domain_key" ON "custom_domains"("domain")
        `;

        // Create domain index
        await this.$executeRaw`
          CREATE INDEX IF NOT EXISTS "custom_domains_domain_idx" ON "custom_domains"("domain")
        `;

        // Create organization index
        await this.$executeRaw`
          CREATE INDEX IF NOT EXISTS "custom_domains_organizationId_idx" ON "custom_domains"("organizationId")
        `;

        // Add foreign key constraint
        await this.$executeRaw`
          ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `;

        // Create the domain status enum if it doesn't exist
        await this.$executeRaw`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DomainStatus') THEN
              CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
            END IF;
          END
          $$
        `;

        // Convert the text column to the enum type
        await this.$executeRaw`
          ALTER TABLE "custom_domains" 
          ALTER COLUMN "status" TYPE "DomainStatus" 
          USING "status"::"DomainStatus"
        `;

        this.logger.log('Successfully created custom_domains table');
      } catch (createError) {
        const errorMessage =
          createError instanceof Error ? createError.message : 'Unknown error';
        this.logger.error(
          `Failed to create custom_domains table: ${errorMessage}`,
        );
        // Don't throw - let the application continue
      }
    }
  }

  /**
   * Ensures the ssl_certificates table exists
   * This is a workaround for environments where migrations can't be run
   */
  private async ensureSslCertificatesTable() {
    try {
      // Check if the table exists by attempting a simple query
      await this.$queryRaw`SELECT 1 FROM "ssl_certificates" LIMIT 1`;
      this.logger.log('ssl_certificates table exists');
    } catch (error) {
      // Table doesn't exist, create it
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `ssl_certificates table does not exist (${errorMessage}), creating it...`,
      );
      try {
        // Create the table
        await this.$executeRaw`
          CREATE TABLE IF NOT EXISTS "ssl_certificates" (
            "id" SERIAL NOT NULL,
            "customDomainId" INTEGER NOT NULL,
            "certificate" TEXT NOT NULL,
            "privateKey" TEXT NOT NULL,
            "issuedAt" TIMESTAMP(3) NOT NULL,
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "ssl_certificates_pkey" PRIMARY KEY ("id")
          )
        `;

        // Create unique index
        await this.$executeRaw`
          CREATE UNIQUE INDEX IF NOT EXISTS "ssl_certificates_customDomainId_key" ON "ssl_certificates"("customDomainId")
        `;

        // Add foreign key constraint
        await this.$executeRaw`
          ALTER TABLE "ssl_certificates" ADD CONSTRAINT "ssl_certificates_customDomainId_fkey"
          FOREIGN KEY ("customDomainId") REFERENCES "custom_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `;

        this.logger.log('Successfully created ssl_certificates table');
      } catch (createError) {
        const errorMessage =
          createError instanceof Error ? createError.message : 'Unknown error';
        this.logger.error(
          `Failed to create ssl_certificates table: ${errorMessage}`,
        );
        // Don't throw - let the application continue
      }
    }
  }

  /**
   * Ensures a default domain record exists for the Render.com domain
   */
  private async ensureDefaultDomainRecord() {
    try {
      const renderDomain = 'nestjs-starter-template.onrender.com';

      // Check if the domain record already exists
      const existingDomain = await this.customDomain.findUnique({
        where: { domain: renderDomain },
      });

      if (existingDomain) {
        this.logger.log(
          `Default domain record for ${renderDomain} already exists`,
        );

        // If the domain exists but isn't verified, update it to verified
        if (existingDomain.status !== 'VERIFIED') {
          await this.customDomain.update({
            where: { id: existingDomain.id },
            data: {
              status: 'VERIFIED',
              verifiedAt: new Date(),
            },
          });
          this.logger.log(`Updated ${renderDomain} status to VERIFIED`);
        }

        return;
      }

      // Check if we have at least one organization
      const organization = await this.organization.findFirst({
        orderBy: { id: 'asc' },
      });

      if (!organization) {
        this.logger.warn(
          'No organizations found, cannot create default domain record',
        );
        return;
      }

      // Create the default domain record
      await this.customDomain.create({
        data: {
          domain: renderDomain,
          organizationId: organization.id,
          status: 'VERIFIED',
          verificationToken: 'auto-verified',
          verifiedAt: new Date(),
        },
      });

      this.logger.log(`Created default domain record for ${renderDomain}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create default domain record: ${errorMessage}`,
      );
      // Don't throw - let the application continue
    }
  }
}
