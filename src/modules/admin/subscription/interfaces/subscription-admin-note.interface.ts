import { User } from '@prisma/client';
import { SubscriptionNoteType } from '../dto/add-subscription-note.dto';

/**
 * @interface SubscriptionAdminNote
 * @description Interface for subscription administrative notes
 */
export interface SubscriptionAdminNote {
  id: number;
  subscriptionId: number;
  note: string;
  type: SubscriptionNoteType;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  author?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
}
