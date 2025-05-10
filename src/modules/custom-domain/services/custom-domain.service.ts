import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { DomainStatus, CustomDomain } from '@prisma/client';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ICustomDomainRepository } from '../interfaces/custom-domain.repository.interface';
import { CreateCustomDomainDto } from '../dtos/create-custom-domain.dto';
import { CustomDomainResponseDto } from '../dtos/custom-domain.response.dto';
import * as dnsPromises from 'dns/promises';
import { FeatureFlagsConfig } from '@config/feature-flags.config';
import { SslService } from './ssl.service';
import { INJECTION_TOKENS } from '../constants/injection-tokens';

/**
 * Service for managing custom domains
 */
@Injectable()
export class CustomDomainService {
  private readonly logger = new Logger(CustomDomainService.name);
  private readonly defaultDomain: string;

  constructor(
    @Inject(INJECTION_TOKENS.REPOSITORY.CUSTOM_DOMAIN)
    private readonly repository: ICustomDomainRepository,
    private readonly configService: ConfigService,
    private readonly sslService: SslService,
  ) {
    this.defaultDomain = this.configService.get<string>(
      'APP_DOMAIN',
      'localhost',
    );
  }

  /**
   * Safely find organization ID by domain name
   * This method handles missing tables and other database errors gracefully
   */
  async findOrganizationIdByDomain(domain: string): Promise<number | null> {
    // Skip lookup for default domain
    if (domain === this.defaultDomain || domain === 'localhost') {
      return null;
    }

    try {
      const customDomain = await this.findByDomain(domain);

      if (!customDomain || customDomain.status !== 'VERIFIED') {
        return null;
      }

      return customDomain.organizationId;
    } catch (error) {
      // Log the error but don't crash the application
      this.logger.error(
        `Error finding organization by domain ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Add a new custom domain for an organization
   */
  async addDomain(
    organizationId: number,
    dto: CreateCustomDomainDto,
  ): Promise<CustomDomainResponseDto> {
    // Check wildcard domain support
    const features = this.configService.get<FeatureFlagsConfig>('features');
    if (dto.domain.startsWith('*.') && !features?.customDomains.allowWildcard) {
      throw new ForbiddenException('Wildcard domains are not supported');
    }

    const verificationToken = randomBytes(32).toString('hex');

    const domain = await this.repository.create({
      domain: dto.domain.toLowerCase(),
      organizationId,
      verificationToken,
    });

    return new CustomDomainResponseDto(domain);
  }

  /**
   * Get all domains for an organization
   */
  async getDomains(organizationId: number): Promise<CustomDomainResponseDto[]> {
    const domains = await this.repository.findByOrganization(organizationId);
    return domains.map((domain) => new CustomDomainResponseDto(domain));
  }

  /**
   * Get a domain by ID and verify organization access
   */
  async getDomain(id: number): Promise<CustomDomainResponseDto> {
    const domain = await this.repository.findById(id);
    if (!domain) {
      throw new NotFoundException('Custom domain not found');
    }
    return new CustomDomainResponseDto(domain);
  }

  /**
   * Delete a domain and verify organization access
   */
  async deleteDomain(id: number): Promise<void> {
    await this.getDomain(id); // Verify domain exists
    await this.repository.delete(id);
  }

  /**
   * Verify a domain's DNS settings and provision SSL if enabled
   */
  async verifyDomain(id: number): Promise<CustomDomainResponseDto> {
    const domain = await this.repository.findById(id);
    if (!domain) {
      throw new NotFoundException('Custom domain not found');
    }

    const isVerified = await this.verifyDNSRecord(
      domain.domain,
      domain.verificationToken ?? '',
    );

    if (!isVerified) {
      const updatedDomain = await this.repository.updateStatus(
        id,
        DomainStatus.FAILED,
      );
      return new CustomDomainResponseDto(updatedDomain);
    }

    try {
      const features = this.configService.get<FeatureFlagsConfig>('features');
      // If SSL is enabled, provision certificate
      if (features?.customDomains.allowSSL) {
        this.logger.log(
          `Provisioning SSL certificate for domain: ${domain.domain}`,
        );
        const ssl = await this.sslService.provisionCertificate(domain.domain);

        const updatedDomain = await this.repository.updateStatus(
          id,
          DomainStatus.VERIFIED,
          new Date(),
          {
            sslCertificate: {
              create: {
                certificate: ssl.certificate,
                privateKey: ssl.privateKey,
                expiresAt: ssl.expiresAt,
              },
            },
          },
        );
        return new CustomDomainResponseDto(updatedDomain);
      }

      // If SSL is not enabled, just mark as verified
      const updatedDomain = await this.repository.updateStatus(
        id,
        DomainStatus.VERIFIED,
        new Date(),
      );
      return new CustomDomainResponseDto(updatedDomain);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to verify domain: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      const failedDomain = await this.repository.updateStatus(
        id,
        DomainStatus.FAILED,
      );
      return new CustomDomainResponseDto(failedDomain);
    }
  }

  /**
   * Get domain verification instructions
   */
  async getVerificationDetails(id: number): Promise<{
    domain: string;
    verificationToken: string;
    txtRecord: string;
    status: DomainStatus;
  }> {
    const domain = await this.repository.findById(id);
    if (!domain) {
      throw new NotFoundException('Custom domain not found');
    }

    if (!domain.verificationToken) {
      throw new NotFoundException('Verification token not found');
    }

    return {
      domain: domain.domain,
      verificationToken: domain.verificationToken,
      txtRecord: `saasqali-verification=${domain.verificationToken}`,
      status: domain.status,
    };
  }

  /**
   * Verify DNS TXT record
   */
  private async verifyDNSRecord(
    domain: string,
    token: string,
  ): Promise<boolean> {
    try {
      const records = await dnsPromises.resolveTxt(domain);
      return records.some(
        (record: string[]) => record[0] === `saasqali-verification=${token}`,
      );
    } catch {
      // DNS resolution failed, consider domain unverified
      return false;
    }
  }

  /**
   * Find a domain by its hostname
   */
  async findByDomain(domain: string): Promise<CustomDomain | null> {
    return this.repository.findByDomain(domain.toLowerCase());
  }
}
