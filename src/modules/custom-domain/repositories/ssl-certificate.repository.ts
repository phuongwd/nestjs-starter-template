import { Injectable } from '@nestjs/common';
import { SslCertificate, CertStatus } from '@prisma/client';
import { BaseRepository } from '@shared/repositories/base.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { ISslCertificateRepository } from '../interfaces/ssl-certificate.repository.interface';

/**
 * Repository implementation for SSL certificate operations
 * Extends BaseRepository for common functionality and implements
 * ISslCertificateRepository for type safety and contract enforcement
 */
@Injectable()
export class SslCertificateRepository
  extends BaseRepository<SslCertificate>
  implements ISslCertificateRepository
{
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'SslCertificate');
  }

  protected isTenantAware(): boolean {
    return false; // SSL certificates are not tenant-specific
  }

  async findById(
    id: number,
  ): Promise<(SslCertificate & { domain: { domain: string } }) | null> {
    return this.prisma.sslCertificate.findUnique({
      where: { id },
      include: { domain: true },
    });
  }

  async update(
    id: number,
    data: {
      certificate: string;
      privateKey: string;
      expiresAt: Date;
      issuedAt: Date;
      status: CertStatus;
    },
  ): Promise<SslCertificate> {
    return this.prisma.sslCertificate.update({
      where: { id },
      data,
    });
  }
}
