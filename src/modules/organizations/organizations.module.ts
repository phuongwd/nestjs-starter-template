import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationService } from './services/organization.service';
import { MemberController } from './controllers/member.controller';
import { MemberService } from './services/member.service';
import { OrganizationRepository } from './repositories/organization.repository';
import { MemberRepository } from './repositories/member.repository';
import { MemberActivityRepository } from './repositories/member-activity.repository';
import { PendingRegistrationRepository } from './repositories/pending-registration.repository';
import { MemberRoleRepository } from './repositories/member-role.repository';
import { PermissionsModule } from '../permissions/permissions.module';
import { TenantContextMiddleware } from '../../shared/middleware/tenant-context.middleware';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailModule } from '../email/email.module';
import { MemberCacheService } from './services/member-cache.service';
import { OrganizationPermissionService } from './services/organization-permission.service';
import {
  ORGANIZATION_REPOSITORY,
  MEMBER_REPOSITORY,
  MEMBER_ACTIVITY_REPOSITORY,
  PENDING_REGISTRATION_REPOSITORY,
  MEMBER_ROLE_REPOSITORY,
} from './constants/injection-tokens';
import { RoleController } from './controllers/role.controller';
import { RoleService } from './services/role.service';

@Module({
  imports: [PermissionsModule, SubscriptionsModule, EmailModule],
  controllers: [OrganizationsController, MemberController, RoleController],
  providers: [
    MemberService,
    OrganizationService,
    RoleService,
    MemberCacheService,
    OrganizationPermissionService,
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },
    {
      provide: MEMBER_REPOSITORY,
      useClass: MemberRepository,
    },
    {
      provide: MEMBER_ACTIVITY_REPOSITORY,
      useClass: MemberActivityRepository,
    },
    {
      provide: PENDING_REGISTRATION_REPOSITORY,
      useClass: PendingRegistrationRepository,
    },
    {
      provide: MEMBER_ROLE_REPOSITORY,
      useClass: MemberRoleRepository,
    },
  ],
  exports: [
    OrganizationService,
    MemberService,
    RoleService,
    MemberCacheService,
    OrganizationPermissionService,
    ORGANIZATION_REPOSITORY,
    MEMBER_REPOSITORY,
    MEMBER_ACTIVITY_REPOSITORY,
    PENDING_REGISTRATION_REPOSITORY,
    MEMBER_ROLE_REPOSITORY,
  ],
})
export class OrganizationsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        { path: 'organizations', method: RequestMethod.POST }, // Exclude organization creation since no tenant context exists yet
      )
      .forRoutes(
        { path: 'organizations/*', method: RequestMethod.ALL },
        { path: 'members', method: RequestMethod.ALL },
        { path: 'members/*', method: RequestMethod.ALL },
        { path: 'roles', method: RequestMethod.ALL },
        { path: 'roles/*', method: RequestMethod.ALL },
      );
  }
}
