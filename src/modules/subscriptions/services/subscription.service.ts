import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { Subscription } from '@prisma/client';
import { BillingService } from './billing.service';
import { PlanService } from './plan.service';
import { SubscriptionConfig } from '@/config/subscription.config';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly subscriptionConfig: SubscriptionConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
  ) {
    this.subscriptionConfig =
      this.configService.get<SubscriptionConfig>('app.subscription')!;
  }

  /**
   * Create a new subscription for an organization
   */
  async create(
    organizationId: number,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    try {
      // Check if organization already has an active subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { organizationId },
      });

      if (existingSubscription) {
        throw new ConflictException(
          'Organization already has an active subscription',
        );
      }

      // Verify plan exists and is active
      const plan = await this.planService.findOne(dto.planId);
      if (!plan.isActive) {
        throw new BadRequestException('Selected plan is not available');
      }

      // Set up payment method if provided
      if (dto.paymentMethodId) {
        await this.billingService.validatePaymentMethod(dto.paymentMethodId);
      }

      const now = new Date();
      const trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : null;

      // Create subscription
      const subscription = await this.prisma.subscription.create({
        data: {
          organizationId,
          planId: dto.planId,
          status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
          startDate: now,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: this.calculatePeriodEnd(now, plan.interval),
          paymentMethodId: dto.paymentMethodId,
        },
        include: {
          plan: true,
          organization: true,
        },
      });

      // If not in trial and payment method provided, create initial billing record
      if (!trialEndsAt && dto.paymentMethodId) {
        const amount = Number(plan.price);
        await this.billingService.createBillingRecord(subscription.id, amount);
      }

      return subscription;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error creating subscription for organization ${organizationId}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Get subscription details for an organization
   */
  async findByOrganization(
    organizationId: number,
  ): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: true,
        billingHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return subscription;
  }

  /**
   * Cancel a subscription
   */
  async cancel(organizationId: number): Promise<Subscription> {
    const subscription = await this.findByOrganization(organizationId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    // If there's a payment method, cancel with payment provider
    if (subscription.paymentMethodId) {
      await this.billingService.cancelSubscription(subscription.id);
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        canceledAt: new Date(),
      },
    });
  }

  /**
   * Change subscription plan
   */
  async changePlan(
    organizationId: number,
    newPlanId: number,
  ): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const newPlan = await this.planService.findOne(newPlanId);
    if (!newPlan.isActive) {
      throw new BadRequestException('Selected plan is not available');
    }

    // If there's a payment method, handle payment changes
    if (subscription.paymentMethodId) {
      const oldAmount = Number(subscription.plan.price);
      const newAmount = Number(newPlan.price);
      await this.billingService.handlePlanChange(
        subscription.id,
        oldAmount,
        newAmount,
      );
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: newPlanId,
        currentPeriodEnd: this.calculatePeriodEnd(
          new Date(subscription.currentPeriodStart),
          newPlan.interval,
        ),
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    organizationId: number,
    paymentMethodId: string,
  ): Promise<Subscription> {
    const subscription = await this.findByOrganization(organizationId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    await this.billingService.validatePaymentMethod(paymentMethodId);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        paymentMethodId,
      },
    });
  }

  /**
   * Calculate the end date of a billing period based on interval
   */
  private calculatePeriodEnd(startDate: Date, interval: string): Date {
    const endDate = new Date(startDate);

    switch (interval.toLowerCase()) {
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'one_time':
        endDate.setFullYear(endDate.getFullYear() + 100); // Effectively unlimited
        break;
      default:
        throw new Error(`Invalid billing interval: ${interval}`);
    }

    return endDate;
  }

  /**
   * Get member limit for organization based on their subscription plan
   */
  async getMemberLimit(organizationId: number): Promise<number> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      // Return free plan limit if no active subscription
      return this.subscriptionConfig.freePlan.memberLimit;
    }

    // If subscription is in trial, use trial member limit
    if (subscription.status === 'TRIALING') {
      return this.subscriptionConfig.trial.memberLimit;
    }

    // Return plan's member limit or fallback to free plan limit
    return (
      subscription.plan.memberLimit ??
      this.subscriptionConfig.freePlan.memberLimit
    );
  }

  /**
   * Check if organization has reached its member limit
   * @throws {ForbiddenException} If member limit is reached
   */
  async checkMemberLimit(organizationId: number): Promise<void> {
    const [currentCount, limit] = await Promise.all([
      this.prisma.organizationMember.count({
        where: { organizationId },
      }),
      this.getMemberLimit(organizationId),
    ]);

    if (currentCount >= limit) {
      throw new ForbiddenException('Organization member limit reached');
    }
  }
}
