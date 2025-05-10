import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionsModule } from '@/modules/subscriptions/subscriptions.module';
import { OrganizationsModule } from '@/modules/organizations/organizations.module';
import { EmailModule } from '@/modules/email/email.module';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { SubscriptionAdminService } from './services/subscription-admin.service';
import { SUBSCRIPTION_ADMIN_TOKENS } from './constants/injection-tokens';
import { SubscriptionAdminController } from './controllers/subscription-admin.controller';
import { SubscriptionRepository } from '@/modules/subscriptions/repositories/subscription.repository';
import { MemberRepository } from '@/modules/organizations/repositories/member.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { SystemRolesModule } from '../system-roles/system-roles.module';

/**
 * @module SubscriptionAdminModule
 * @description Administrative functionality for subscription management
 *
 * Dependencies:
 * - ConfigModule: For configuration
 * - SubscriptionsModule: For subscription data access
 * - OrganizationsModule: For organization data
 * - EmailModule: For notifications
 * - PermissionsModule: For access control
 * - SystemRolesModule: For admin role validation
 * - AdminSharedModule: For admin guards and audit logging
 *
 * Exports:
 * - SubscriptionAdminService: For use in other admin modules
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SubscriptionsModule,
    OrganizationsModule,
    EmailModule,
    PermissionsModule,
    SystemRolesModule,
    AdminSharedModule,
  ],
  controllers: [SubscriptionAdminController],
  providers: [
    SubscriptionRepository,
    MemberRepository,
    {
      provide: SUBSCRIPTION_ADMIN_TOKENS.SERVICE.SUBSCRIPTION,
      useClass: SubscriptionAdminService,
    },
  ],
  exports: [SUBSCRIPTION_ADMIN_TOKENS.SERVICE.SUBSCRIPTION],
})
export class SubscriptionAdminModule {}
