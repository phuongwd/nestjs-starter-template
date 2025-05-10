import { Injectable, Logger, Inject } from '@nestjs/common';
import { ICustomDomainRepository } from '../interfaces/custom-domain.repository.interface';
import * as https from 'https';
import * as dns from 'dns/promises';
import { Socket } from 'net';
import { INJECTION_TOKENS } from '../constants/injection-tokens';

interface ExtendedSocket extends Socket {
  getPeerCertificate(): {
    valid_to: string;
  };
}

export interface DomainHealthCheck {
  isAccessible: boolean;
  hasSsl: boolean;
  sslExpiryDays?: number;
  dnsStatus: {
    hasARecord: boolean;
    hasCnameRecord: boolean;
    hasTxtRecord: boolean;
  };
  lastChecked: Date;
}

@Injectable()
export class DomainHealthService {
  private readonly logger = new Logger(DomainHealthService.name);

  constructor(
    @Inject(INJECTION_TOKENS.REPOSITORY.CUSTOM_DOMAIN)
    private readonly repository: ICustomDomainRepository,
  ) {}

  /**
   * Check health of a domain
   */
  async checkDomainHealth(domain: string): Promise<DomainHealthCheck> {
    this.logger.log(`Checking health for domain: ${domain}`);

    const [isAccessible, dnsStatus] = await Promise.all([
      this.checkDomainAccess(domain),
      this.checkDnsRecords(domain),
    ]);

    const sslInfo = await this.checkSslCertificate(domain);

    return {
      isAccessible,
      hasSsl: sslInfo !== null,
      sslExpiryDays: sslInfo?.daysUntilExpiry,
      dnsStatus,
      lastChecked: new Date(),
    };
  }

  /**
   * Check if domain is accessible via HTTPS
   */
  private async checkDomainAccess(domain: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: domain,
          port: 443,
          method: 'HEAD',
          timeout: 5000,
        },
        (res) => {
          const statusCode = res.statusCode ?? 0;
          resolve(statusCode >= 200 && statusCode < 500);
        },
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * Check DNS records
   */
  private async checkDnsRecords(domain: string): Promise<{
    hasARecord: boolean;
    hasCnameRecord: boolean;
    hasTxtRecord: boolean;
  }> {
    try {
      const [aRecords, cnameRecords, txtRecords] = await Promise.all([
        dns.resolve4(domain).catch(() => []),
        dns.resolveCname(domain).catch(() => []),
        dns.resolveTxt(domain).catch(() => []),
      ]);

      return {
        hasARecord: aRecords.length > 0,
        hasCnameRecord: cnameRecords.length > 0,
        hasTxtRecord: txtRecords.length > 0,
      };
    } catch {
      return {
        hasARecord: false,
        hasCnameRecord: false,
        hasTxtRecord: false,
      };
    }
  }

  /**
   * Check SSL certificate status
   */
  private async checkSslCertificate(
    domain: string,
  ): Promise<{ daysUntilExpiry: number } | null> {
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: domain,
          port: 443,
          method: 'HEAD',
          timeout: 5000,
        },
        (res) => {
          const socket = res.socket as ExtendedSocket;
          const cert = socket.getPeerCertificate();
          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const daysUntilExpiry = Math.floor(
              (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );
            resolve({ daysUntilExpiry });
          } else {
            resolve(null);
          }
        },
      );

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    });
  }

  /**
   * Schedule health checks for all domains
   */
  async scheduleHealthChecks(): Promise<void> {
    const domains = await this.repository.findAll();

    for (const domain of domains) {
      try {
        const health = await this.checkDomainHealth(domain.domain);

        // Update domain status if needed
        if (!health.isAccessible || !health.hasSsl) {
          await this.repository.updateStatus(domain.id, 'FAILED');
          this.logger.warn(
            `Domain ${domain.domain} health check failed: ${JSON.stringify(health)}`,
          );
        }

        // Alert if SSL is expiring soon
        if (health.sslExpiryDays && health.sslExpiryDays < 30) {
          this.logger.warn(
            `SSL certificate for ${domain.domain} expires in ${health.sslExpiryDays} days`,
          );
          // TODO: Implement notification system
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to check health for domain ${domain.domain}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }
}
