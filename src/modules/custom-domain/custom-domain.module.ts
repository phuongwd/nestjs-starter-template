import { Module } from '@nestjs/common';
import { CommonModule } from '@shared/common.module';
import { CustomDomainController } from './controllers/custom-domain.controller';
import { CustomDomainService } from './services/custom-domain.service';
import { CustomDomainRepository } from './repositories/custom-domain.repository';
import { SslService } from './services/ssl.service';
import { DomainHealthService } from './services/domain-health.service';
import { FeatureFlagGuard } from '@shared/guards/feature-flag.guard';
import { ConfigModule } from '@nestjs/config';
import { INJECTION_TOKENS } from './constants/injection-tokens';
import { SslCertificateRepository } from './repositories/ssl-certificate.repository';

/**
 * Module for managing custom domains
 * This feature is controlled by the 'customDomains' feature flag
 *
 * Imports:
 * - CommonModule for access to permission guards and common utilities
 * - ConfigModule for configuration access
 *
 * Guards:
 * - FeatureFlagGuard to control feature availability
 * - PermissionGuard from CommonModule for route protection
 */
@Module({
  imports: [
    CommonModule, // Import to use permission guards and common utilities
    ConfigModule, // Import to use ConfigService
  ],
  controllers: [CustomDomainController],
  providers: [
    CustomDomainService,
    {
      provide: INJECTION_TOKENS.REPOSITORY.CUSTOM_DOMAIN,
      useClass: CustomDomainRepository,
    },
    {
      provide: INJECTION_TOKENS.REPOSITORY.SSL_CERTIFICATE,
      useClass: SslCertificateRepository,
    },
    SslService,
    DomainHealthService,
    FeatureFlagGuard,
  ],
  exports: [
    CustomDomainService,
    DomainHealthService,
    {
      provide: INJECTION_TOKENS.REPOSITORY.CUSTOM_DOMAIN,
      useClass: CustomDomainRepository,
    },
  ],
})
export class CustomDomainModule {}
