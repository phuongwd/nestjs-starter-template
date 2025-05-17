import { PendingRegistrations } from '@prisma/client';

export interface IPendingRegistrationRepository {
  /**
   * Find a pending registration by email and invitation token
   */
  findByToken(
    email: string,
    invitationToken: string,
  ): Promise<PendingRegistrations | null>;

  /**
   * Create a new pending registration
   */
  create(data: {
    email: string;
    organizationId: number;
    invitationToken: string;
    roleNames: string[];
  }): Promise<PendingRegistrations>;

  /**
   * Delete a pending registration
   */
  delete(id: number): Promise<void>;

  /**
   * Find expired registrations
   */
  findExpired(): Promise<PendingRegistrations[]>;

  /**
   * Clean up expired registrations
   */
  cleanupExpired(): Promise<number>;
}
