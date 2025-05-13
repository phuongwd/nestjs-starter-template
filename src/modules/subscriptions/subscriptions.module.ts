import { Module, MiddlewareConsumer } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionService } from './services/subscription.service';
import { PlanService } from './services/plan.service';
import { BillingService } from './services/billing.service';
import { PaymentService } from './services/payment.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TenantContextMiddleware } from '../../shared/middleware/tenant-context.middleware';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionService, PlanService, BillingService, PaymentService],
  exports: [SubscriptionService],
})
export class SubscriptionsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes(SubscriptionsController);
  }
}
