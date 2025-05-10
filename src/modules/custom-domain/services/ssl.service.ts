import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CertStatus, SslCertificate } from '@prisma/client';
import * as acme from 'acme-client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ISslCertificateRepository } from '../interfaces/ssl-certificate.repository.interface';
import { INJECTION_TOKENS } from '../constants/injection-tokens';

export interface ICertificateResult {
  certificate: string;
  privateKey: string;
  expiresAt: Date;
}

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);
  private client: acme.Client | null = null;
  private certDir: string | null = null;
  private challengeDir: string | null = null;
  private isEnabled = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(INJECTION_TOKENS.REPOSITORY.SSL_CERTIFICATE)
    private readonly repository: ISslCertificateRepository,
  ) {
    this.initializeIfEnabled();
  }

  /**
   * Initialize ACME client and SSL configuration if the feature is enabled
   * @private
   */
  private initializeIfEnabled(): void {
    const accountKey = this.configService.get<string>('SSL_ACCOUNT_KEY');
    if (!accountKey) {
      this.logger.warn(
        'SSL_ACCOUNT_KEY is not configured. SSL features will be disabled.',
      );
      return;
    }

    const certDir = this.configService.get<string>('SSL_CERT_DIR');
    if (!certDir) {
      this.logger.warn(
        'SSL_CERT_DIR is not configured. SSL features will be disabled.',
      );
      return;
    }

    const challengeDir = this.configService.get<string>('ACME_CHALLENGE_DIR');
    if (!challengeDir) {
      this.logger.warn(
        'ACME_CHALLENGE_DIR is not configured. SSL features will be disabled.',
      );
      return;
    }

    try {
      const isProduction =
        this.configService.get<string>('NODE_ENV') === 'production';
      this.client = new acme.Client({
        directoryUrl: isProduction
          ? acme.directory.letsencrypt.production
          : acme.directory.letsencrypt.staging,
        accountKey: accountKey,
      });

      this.certDir = certDir;
      this.challengeDir = challengeDir;
      this.isEnabled = true;
      this.logger.log('SSL service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SSL service:', error);
    }
  }

  /**
   * Check if SSL features are enabled
   * @private
   */
  private ensureEnabled(): void {
    if (!this.isEnabled || !this.client) {
      throw new Error(
        'SSL features are not enabled. Please check your configuration.',
      );
    }
  }

  /**
   * Provision a new SSL certificate for a domain
   */
  async provisionCertificate(domain: string): Promise<ICertificateResult> {
    this.ensureEnabled();
    this.logger.log(`Provisioning certificate for domain: ${domain}`);

    try {
      // Create CSR
      const [key, csr] = await acme.forge.createCsr({
        commonName: domain,
      });

      // Get certificate
      const cert = await this.client!.auto({
        csr,
        email: this.configService.get<string>('SSL_ADMIN_EMAIL'),
        termsOfServiceAgreed: true,
        challengePriority: ['http-01'],
        challengeCreateFn: async (
          _authz: unknown,
          challenge: { token: string },
          keyAuthorization: string,
        ): Promise<void> => {
          this.ensureEnabled();
          const challengePath = path.join(this.challengeDir!, challenge.token);
          await fs.writeFile(challengePath, keyAuthorization);
        },
        challengeRemoveFn: async (
          _authz: unknown,
          challenge: { token: string },
          _keyAuthorization: string,
        ): Promise<void> => {
          this.ensureEnabled();
          const challengePath = path.join(this.challengeDir!, challenge.token);
          await fs.unlink(challengePath).catch(() => {});
        },
      });

      // Save certificate files
      const domainDir = path.join(this.certDir!, domain);
      await fs.mkdir(domainDir, { recursive: true });
      await fs.writeFile(path.join(domainDir, 'privkey.pem'), key.toString());
      await fs.writeFile(path.join(domainDir, 'cert.pem'), cert);

      // Calculate expiry (90 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      return {
        certificate: cert,
        privateKey: key.toString(),
        expiresAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to provision certificate: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Renew an existing SSL certificate
   */
  async renewCertificate(certificateId: number): Promise<SslCertificate> {
    this.ensureEnabled();
    const cert = await this.repository.findById(certificateId);

    if (!cert) {
      throw new Error('Certificate not found');
    }

    try {
      const result = await this.provisionCertificate(cert.domain.domain);

      return this.repository.update(certificateId, {
        certificate: result.certificate,
        privateKey: result.privateKey,
        expiresAt: result.expiresAt,
        issuedAt: new Date(),
        status: CertStatus.ACTIVE,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to renew certificate: ${errorMessage}`);
      throw error;
    }
  }
}
