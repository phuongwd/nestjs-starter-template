import { PendingRegistration } from '@prisma/client';

export interface IPendingRegistrationRepository {
  /**
   * Find a pending registration by email and invitation token
   */
  findByToken(
    email: string,
    invitationToken: string,
  ): Promise<PendingRegistration | null>;

  /**
   * Create a new pending registration
   */
  create(data: {
    email: string;
    organizationId: number;
    invitationToken: string;
    roleNames: string[];
  }): Promise<PendingRegistration>;

  /**
   * Delete a pending registration
   */
  delete(id: number): Promise<void>;

  /**
   * Find expired registrations
   */
  findExpired(): Promise<PendingRegistration[]>;

  /**
   * Clean up expired registrations
   */
  cleanupExpired(): Promise<number>;
}
