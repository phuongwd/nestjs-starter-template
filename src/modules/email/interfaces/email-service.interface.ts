import { Organization } from '@prisma/client';
import { EmailUser, EmailParams } from '../types/email.types';

/**
 * @interface IEmailService
 * @description Service contract for sending emails
 */
export interface IEmailService {
  /**
   * Sends an email using a template
   * @param params The parameters for sending the email
   * @returns A promise that resolves when the email is sent
   */
  sendEmail(params: EmailParams): Promise<void>;

  /**
   * Send member invitation email
   */
  sendMemberInvitation(
    organization: Organization,
    invitedEmail: string,
    invitedBy: EmailUser,
    invitationToken: string,
    customMessage?: string,
  ): Promise<void>;

  /**
   * Send registration invitation email
   */
  sendRegistrationInvitation(
    organization: Organization,
    invitedEmail: string,
    invitedBy: EmailUser,
    invitationToken: string,
    customMessage?: string,
  ): Promise<void>;

  /**
   * Send role updated notification
   */
  sendRoleUpdatedNotification(
    organization: Organization,
    user: EmailUser,
    roleNames: string[],
  ): Promise<void>;

  /**
   * Send member removed notification
   */
  sendMemberRemovedNotification(
    organization: Organization,
    user: EmailUser,
  ): Promise<void>;

  /**
   * Send invitation accepted notification
   */
  sendInvitationAcceptedNotification(
    organization: Organization,
    acceptedBy: EmailUser,
    admin: EmailUser,
  ): Promise<void>;

  /**
   * Send registration completed notification
   */
  sendRegistrationCompletedNotification(
    organization: Organization,
    newMember: EmailUser,
    admin: EmailUser,
  ): Promise<void>;
}
