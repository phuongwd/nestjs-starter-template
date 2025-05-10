import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { BillingHistory } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Create a billing record and process payment
   */
  async createBillingRecord(
    subscriptionId: number,
    amount: number,
  ): Promise<BillingHistory> {
    try {
      // Get subscription details
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          organization: true,
        },
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Process payment
      const paymentResult = await this.paymentService.processPayment(
        amount,
        'USD', // TODO: Make currency configurable
        subscription.paymentMethodId || 'manual',
        {
          type: 'subscription',
          subscriptionId: subscriptionId.toString(),
          planId: subscription.planId.toString(),
          periodStart: subscription.currentPeriodStart.toISOString(),
          periodEnd: subscription.currentPeriodEnd.toISOString(),
        },
      );

      // Create billing record
      return this.prisma.billingHistory.create({
        data: {
          subscriptionId,
          amount,
          status: paymentResult.success ? 'PAID' : 'FAILED',
          paymentIntentId: paymentResult.transactionId,
          paymentMethod: subscription.paymentMethodId || 'manual',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create billing record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Cancel subscription with payment provider
   */
  async cancelSubscription(subscriptionId: number): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Cancel with payment provider
      await this.paymentService.cancelSubscription(
        subscription.paymentMethodId || `manual_${subscriptionId}`,
      );

      // Update subscription status
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          canceledAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Handle plan change and calculate prorated charges
   */
  async handlePlanChange(
    subscriptionId: number,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: true,
        },
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // Calculate prorated amount if needed
      const proratedAmount = this.calculateProratedAmount(
        oldPrice,
        newPrice,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
      );

      if (proratedAmount > 0) {
        // Process additional charge
        await this.createBillingRecord(subscriptionId, proratedAmount);
      }

      // Update subscription with payment provider
      await this.paymentService.updateSubscription(
        subscription.paymentMethodId || `manual_${subscriptionId}`,
        subscription.planId.toString(),
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle plan change: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Calculate prorated amount for plan changes
   */
  private calculateProratedAmount(
    oldPrice: number,
    newPrice: number,
    periodStart: Date,
    periodEnd: Date,
  ): number {
    const totalDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const remainingDays = Math.ceil(
      (periodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    const oldPricePerDay = oldPrice / totalDays;
    const newPricePerDay = newPrice / totalDays;

    return Math.max(0, (newPricePerDay - oldPricePerDay) * remainingDays);
  }

  /**
   * Validate payment method
   */
  async validatePaymentMethod(paymentMethodId: string): Promise<void> {
    await this.paymentService.validatePaymentMethod(paymentMethodId);
  }
}
