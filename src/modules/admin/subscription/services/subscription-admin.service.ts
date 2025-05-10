import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionRepository } from '@/modules/subscriptions/repositories/subscription.repository';
import { MemberRepository } from '@/modules/organizations/repositories/member.repository';
import {
  ISubscriptionAdminService,
  SubscriptionWithDetails,
} from '../interfaces/subscription-admin.interface';
import { IEmailService } from '@/modules/email/interfaces/email-service.interface';
import { EMAIL_TOKENS } from '@/modules/email/constants/injection-tokens';
import { ROLE_NAMES } from '@/modules/organizations/constants/role.constants';
import { SubscriptionStatus } from '@/modules/subscriptions/interfaces/subscription-status.enum';
import { SubscriptionAdminNote } from '../interfaces/subscription-admin-note.interface';
import { SubscriptionNoteType } from '../dto/add-subscription-note.dto';

interface PaymentDetails {
  method?: string;
  reference?: string;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
}

interface SubscriptionUpdateData {
  status: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  lastPaymentDate?: Date | null;
  nextPaymentDate?: Date | null;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

@Injectable()
export class SubscriptionAdminService implements ISubscriptionAdminService {
  private readonly logger = new Logger(SubscriptionAdminService.name);
  private readonly trialDurationDays: number;

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly memberRepository: MemberRepository,
    @Inject(EMAIL_TOKENS.SERVICE) private readonly emailService: IEmailService,
    private readonly configService: ConfigService,
  ) {
    this.trialDurationDays = this.configService.get<number>(
      'TRIAL_DURATION_DAYS',
      14,
    );
  }

  async findAll(): Promise<SubscriptionWithDetails[]> {
    try {
      const subscriptions = await this.subscriptionRepository.findMany({
        include: { organization: true, plan: true },
        orderBy: { currentPeriodEnd: 'asc' },
      });
      return subscriptions as SubscriptionWithDetails[];
    } catch (error) {
      this.logger.error('Failed to find all subscriptions', error);
      throw error;
    }
  }

  async findByOrganization(
    organizationId: number,
  ): Promise<SubscriptionWithDetails[]> {
    try {
      const subscriptions = await this.subscriptionRepository.findMany({
        where: { organizationId },
        include: { organization: true, plan: true },
        orderBy: { currentPeriodEnd: 'asc' },
      });
      return subscriptions as SubscriptionWithDetails[];
    } catch (error) {
      this.logger.error(
        `Failed to find subscriptions for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  async findOne(
    id: number,
    organizationId?: number,
  ): Promise<SubscriptionWithDetails> {
    const subscription =
      await this.subscriptionRepository.findByIdWithDetails(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription #${id} not found`);
    }

    // Check organization access
    if (organizationId && subscription.organizationId !== organizationId) {
      throw new NotFoundException(`Subscription #${id} not found`);
    }

    return subscription as SubscriptionWithDetails;
  }

  async findExpiring(): Promise<SubscriptionWithDetails[]> {
    try {
      const subscriptions =
        await this.subscriptionRepository.findExpiringWithin(14);
      return subscriptions as SubscriptionWithDetails[];
    } catch (error) {
      this.logger.error('Failed to find expiring subscriptions', error);
      throw error;
    }
  }

  async findExpiringByOrganization(
    organizationId: number,
  ): Promise<SubscriptionWithDetails[]> {
    try {
      const subscriptions =
        await this.subscriptionRepository.findExpiringWithin(
          14,
          organizationId,
        );
      return subscriptions as SubscriptionWithDetails[];
    } catch (error) {
      this.logger.error(
        `Failed to find expiring subscriptions for organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  async updateStatus(
    id: number,
    status: string,
    paymentDetails?: PaymentDetails,
    organizationId?: number,
  ): Promise<SubscriptionWithDetails> {
    // Verify subscription exists and check organization access
    const subscription = await this.findOne(id, organizationId);

    try {
      const updateData: SubscriptionUpdateData = {
        status,
        paymentMethod: paymentDetails?.method,
        paymentReference: paymentDetails?.reference,
        lastPaymentDate: paymentDetails?.lastPaymentDate,
        nextPaymentDate: paymentDetails?.nextPaymentDate,
      };

      // Handle trial period
      if (status === SubscriptionStatus.TRIAL) {
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(now.getDate() + this.trialDurationDays);

        updateData.trialEndsAt = trialEndsAt;
        updateData.currentPeriodStart = now;
        updateData.currentPeriodEnd = trialEndsAt;

        // Clear any payment details if moving to trial
        updateData.paymentMethod = null;
        updateData.paymentReference = null;
        updateData.lastPaymentDate = null;
        updateData.nextPaymentDate = null;
      }

      // If moving from trial to active, clear trial end date
      if (
        subscription.status === SubscriptionStatus.TRIAL &&
        status === SubscriptionStatus.ACTIVE
      ) {
        updateData.trialEndsAt = null;
      }

      const updated = await this.subscriptionRepository.update(id, updateData);
      await this.sendStatusChangeEmail(updated as SubscriptionWithDetails);
      return updated as SubscriptionWithDetails;
    } catch (error) {
      this.logger.error(`Failed to update subscription ${id} status`, error);
      throw error;
    }
  }

  /**
   * Add administrative note
   */
  async addNote(
    id: number,
    note: string,
    type: SubscriptionNoteType,
    userId: number,
  ): Promise<SubscriptionWithDetails> {
    // Verify subscription exists
    await this.findOne(id);

    try {
      // Create the admin note
      await this.subscriptionRepository.createSubscriptionAdminNote({
        subscriptionId: id,
        note,
        type,
        createdBy: userId,
      });

      // Return updated subscription with notes
      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Failed to add note to subscription ${id}`, error);
      throw error;
    }
  }

  /**
   * Get admin notes for a subscription
   */
  async getNotes(id: number): Promise<SubscriptionAdminNote[]> {
    return this.subscriptionRepository.findSubscriptionAdminNotes(id);
  }

  private async sendStatusChangeEmail(
    subscription: SubscriptionWithDetails,
  ): Promise<void> {
    try {
      const { organization, status } = subscription;
      let templateId: string;

      switch (status) {
        case 'PENDING_PAYMENT':
          templateId = 'subscription-payment-instructions';
          break;
        case 'ACTIVE':
          templateId = 'subscription-activated';
          break;
        case 'PAYMENT_OVERDUE':
          templateId = 'subscription-expired';
          break;
        case 'CANCELLED':
          templateId = 'subscription-cancelled';
          break;
        case 'TRIAL':
          templateId = 'subscription-trial-started';
          break;
        default:
          return;
      }

      // Get all organization admins and billing managers
      const [admins, billingManagers] = await Promise.all([
        this.memberRepository.findAdmins(organization.id),
        this.memberRepository.findMembersByRole(
          organization.id,
          ROLE_NAMES.BILLING_MANAGER,
        ),
      ]);

      // Combine unique recipients (some might be both admin and billing manager)
      const recipients = [...admins, ...billingManagers].filter(
        (member, index, self) =>
          index === self.findIndex((m) => m.email === member.email),
      );

      // Send email to all recipients
      await Promise.all(
        recipients.map((recipient) =>
          this.emailService.sendEmail({
            to: recipient.email,
            templateId,
            data: {
              subscription: JSON.stringify(subscription),
              organization: JSON.stringify(organization),
              recipient: JSON.stringify(recipient),
            },
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to send status change email for subscription ${subscription.id}`,
        error,
      );
      // Don't throw error as this is a background task
    }
  }
}
