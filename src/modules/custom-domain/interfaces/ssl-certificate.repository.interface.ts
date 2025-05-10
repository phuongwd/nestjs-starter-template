import { SslCertificate, CertStatus } from '@prisma/client';

/**
 * Interface for SSL certificate repository operations
 * Defines the contract for certificate-specific database operations
 * following the repository pattern.
 */
export interface ISslCertificateRepository {
  /**
   * Find a certificate by ID with its associated domain
   */
  findById(
    id: number,
  ): Promise<(SslCertificate & { domain: { domain: string } }) | null>;

  /**
   * Update a certificate's details
   */
  update(
    id: number,
    data: {
      certificate: string;
      privateKey: string;
      expiresAt: Date;
      issuedAt: Date;
      status: CertStatus;
    },
  ): Promise<SslCertificate>;
}
