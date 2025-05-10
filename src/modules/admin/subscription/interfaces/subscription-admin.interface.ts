import { Organization, Plan, Subscription } from '@prisma/client';
import { SubscriptionAdminNote } from './subscription-admin-note.interface';
import { SubscriptionNoteType } from '../dto/add-subscription-note.dto';

/**
 * @interface SubscriptionWithDetails
 * @description Extended subscription type with related entities
 */
export interface SubscriptionWithDetails extends Subscription {
  organization: Organization;
  plan: Plan;
}

/**
 * @interface ISubscriptionAdminService
 * @description Service contract for subscription administration
 */
export interface ISubscriptionAdminService {
  /**
   * Find all subscriptions (system admin only)
   */
  findAll(): Promise<SubscriptionWithDetails[]>;

  /**
   * Find subscriptions for a specific organization
   */
  findByOrganization(
    organizationId: number,
  ): Promise<SubscriptionWithDetails[]>;

  /**
   * Find subscription by ID
   * @param id Subscription ID
   * @param organizationId Optional organization ID for access control
   */
  findOne(
    id: number,
    organizationId?: number,
  ): Promise<SubscriptionWithDetails>;

  /**
   * Find all expiring subscriptions (system admin only)
   */
  findExpiring(): Promise<SubscriptionWithDetails[]>;

  /**
   * Find expiring subscriptions for a specific organization
   */
  findExpiringByOrganization(
    organizationId: number,
  ): Promise<SubscriptionWithDetails[]>;

  /**
   * Update subscription status
   * @param id Subscription ID
   * @param status New status
   * @param paymentDetails Optional payment details
   * @param organizationId Optional organization ID for access control
   */
  updateStatus(
    id: number,
    status: string,
    paymentDetails?: {
      method?: string;
      reference?: string;
      lastPaymentDate?: Date;
      nextPaymentDate?: Date;
    },
    organizationId?: number,
  ): Promise<SubscriptionWithDetails>;

  /**
   * Add administrative note
   * @param id Subscription ID
   * @param note Note content
   * @param type Note type
   * @param userId User ID
   */
  addNote(
    id: number,
    note: string,
    type: SubscriptionNoteType,
    userId: number,
  ): Promise<SubscriptionWithDetails>;

  /**
   * Get notes for a subscription
   * @param id Subscription ID
   */
  getNotes(id: number): Promise<SubscriptionAdminNote[]>;
}
