import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Organization } from '@prisma/client';
import { EmailConfig } from '../../config/email.config';
import { IEmailService } from './interfaces/email-service.interface';
import { EmailUser } from './types/email.types';

interface EmailContent {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

interface AppFeatures {
  email?: {
    enabled: boolean;
    requireConfiguration: boolean;
    provider: string;
  };
}

interface EmailError extends Error {
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isEmailEnabled: boolean;
  private readonly isEmailConfigured: boolean;
  private readonly emailProvider: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    const emailConfig = this.configService.get<EmailConfig>('app.email');
    const features = this.configService.get<AppFeatures>('app.features');

    this.isEmailEnabled = features?.email?.enabled ?? false;
    this.isEmailConfigured = emailConfig?.isConfigured ?? false;
    this.emailProvider = features?.email?.provider ?? 'none';

    if (!this.isEmailEnabled) {
      this.logger.warn('Email feature is disabled. No emails will be sent.');
    } else if (
      !this.isEmailConfigured &&
      features?.email?.requireConfiguration
    ) {
      this.logger.warn(
        'Email service is not properly configured. Email notifications will be logged but not sent.',
      );
    } else {
      this.logger.log(
        `Email service initialized with provider: ${this.emailProvider}`,
      );
    }
  }

  /**
   * Log email content when email service is not configured or disabled
   */
  private logEmailContent(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ): void {
    const reason = !this.isEmailEnabled
      ? 'feature disabled'
      : 'service not configured';
    this.logger.debug(`Email not sent (${reason}). Content:`, {
      to,
      subject,
      template,
      context,
    });
  }

  /**
   * Check if email can be sent
   */
  private canSendEmail(): boolean {
    return this.isEmailEnabled && this.isEmailConfigured;
  }

  /**
   * Send an email using a template
   */
  async sendEmail(params: {
    to: string;
    templateId: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    if (!this.canSendEmail()) {
      this.logEmailContent(
        params.to,
        'Email Subject', // TODO: Get from template
        params.templateId,
        params.data,
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: params.to,
        template: params.templateId,
        context: params.data,
      });
      this.logger.log(
        `Sent email with template ${params.templateId} to ${params.to}`,
      );
    } catch (error) {
      const err = error as EmailError;
      this.logger.error(`Failed to send email to ${params.to}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Send member invitation email
   */
  async sendMemberInvitation(
    organization: Organization,
    invitedEmail: string,
    invitedBy: EmailUser,
    invitationToken: string,
    customMessage?: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const acceptUrl = `${appUrl}/organizations/${organization.id}/invitations/${invitationToken}/accept`;

    const emailContent: EmailContent = {
      to: invitedEmail,
      subject: `Invitation to join ${organization.name}`,
      template: 'member-invitation',
      context: {
        organizationName: organization.name,
        invitedByName: `${invitedBy.firstName} ${invitedBy.lastName}`,
        invitedByEmail: invitedBy.email,
        customMessage,
        acceptUrl,
        appUrl,
      },
    };

    if (!this.canSendEmail()) {
      this.logEmailContent(
        emailContent.to,
        emailContent.subject,
        emailContent.template,
        emailContent.context,
      );
      return;
    }

    try {
      await this.mailerService.sendMail(emailContent);
      this.logger.log(
        `Sent invitation email to ${invitedEmail} for organization ${organization.id}`,
      );
    } catch (error) {
      const err = error as EmailError;
      this.logger.error(
        `Failed to send invitation email to ${invitedEmail}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * Send invitation accepted notification to organization admin
   */
  async sendInvitationAcceptedNotification(
    organization: Organization,
    acceptedBy: EmailUser,
    admin: EmailUser,
  ): Promise<void> {
    const emailContent: EmailContent = {
      to: admin.email,
      subject: `New member joined ${organization.name}`,
      template: 'invitation-accepted',
      context: {
        organizationName: organization.name,
        memberName: `${acceptedBy.firstName} ${acceptedBy.lastName}`,
        memberEmail: acceptedBy.email,
        adminName: `${admin.firstName} ${admin.lastName}`,
        appUrl: this.configService.get<string>('APP_URL'),
      },
    };

    if (!this.canSendEmail()) {
      this.logEmailContent(
        emailContent.to,
        emailContent.subject,
        emailContent.template,
        emailContent.context,
      );
      return;
    }

    try {
      await this.mailerService.sendMail(emailContent);
      this.logger.log(
        `Sent invitation accepted notification to ${admin.email} for organization ${organization.id}`,
      );
    } catch (error) {
      const err = error as EmailError;
      this.logger.error(
        `Failed to send invitation accepted notification to ${admin.email}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * Send member removed notification
   */
  async sendMemberRemovedNotification(
    organization: Organization,
    removedUser: EmailUser,
  ): Promise<void> {
    const emailContent: EmailContent = {
      to: removedUser.email,
      subject: `Removed from ${organization.name}`,
      template: 'member-removed',
      context: {
        organizationName: organization.name,
        userName: `${removedUser.firstName} ${removedUser.lastName}`,
        appUrl: this.configService.get<string>('APP_URL'),
      },
    };

    if (!this.canSendEmail()) {
      this.logEmailContent(
        emailContent.to,
        emailContent.subject,
        emailContent.template,
        emailContent.context,
      );
      return;
    }

    try {
      await this.mailerService.sendMail(emailContent);
      this.logger.log(
        `Sent member removed notification to ${removedUser.email} for organization ${organization.id}`,
      );
    } catch (error) {
      const err = error as EmailError;
      this.logger.error(
        `Failed to send member removed notification to ${removedUser.email}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * Send role updated notification
   */
  async sendRoleUpdatedNotification(
    organization: Organization,
    user: EmailUser,
    newRoles: string[],
  ): Promise<void> {
    const emailContent = {
      to: user.email,
      subject: `Role updated in ${organization.name}`,
      template: 'role-updated',
      context: {
        organizationName: organization.name,
        userName: `${user.firstName} ${user.lastName}`,
        newRoles: newRoles.join(', '),
        appUrl: this.configService.get<string>('APP_URL'),
      },
    };

    if (!this.canSendEmail()) {
      this.logEmailContent(
        emailContent.to,
        emailContent.subject,
        emailContent.template,
        emailContent.context,
      );
      return;
    }

    try {
      await this.mailerService.sendMail(emailContent);
      this.logger.log(
        `Sent role updated notification to ${user.email} for organization ${organization.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send role updated notification to ${user.email}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Send registration invitation email to unregistered user
   */
  async sendRegistrationInvitation(
    organization: Organization,
    invitedEmail: string,
    invitedBy: EmailUser,
    invitationToken: string,
    customMessage?: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const registrationUrl = `${appUrl}/register?token=${invitationToken}&email=${encodeURIComponent(invitedEmail)}`;

    const emailContent = {
      to: invitedEmail,
      subject: `Join ${organization.name}`,
      template: 'registration-invitation',
      context: {
        organizationName: organization.name,
        invitedByName: `${invitedBy.firstName} ${invitedBy.lastName}`,
        invitedByEmail: invitedBy.email,
        customMessage,
        registrationUrl,
        appUrl,
      },
    };

    if (!this.canSendEmail()) {
      this.logEmailContent(
        emailContent.to,
        emailContent.subject,
        emailContent.template,
        emailContent.context,
      );
      return;
    }

    try {
      await this.mailerService.sendMail(emailContent);
      this.logger.log(
        `Sent registration invitation email to ${invitedEmail} for organization ${organization.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send registration invitation email to ${invitedEmail}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Send registration completed notification to organization admin
   */
  async sendRegistrationCompletedNotification(
    organization: Organization,
    newMember: EmailUser,
    admin: EmailUser,
  ): Promise<void> {
    const emailContent = {
      to: admin.email,
      subject: `New member registered in ${organization.name}`,
      template: 'registration-completed',
      context: {
        organizationName: organization.name,
        memberName: `${newMember.firstName} ${newMember.lastName}`,
        memberEmail: newMember.email,
        adminName: `${admin.firstName} ${admin.lastName}`,
        appUrl: this.configService.get<string>('APP_URL'),
      },
    };

    if (!this.canSendEmail()) {
      this.logEmailContent(
        emailContent.to,
        emailContent.subject,
        emailContent.template,
        emailContent.context,
      );
      return;
    }

    try {
      await this.mailerService.sendMail(emailContent);
      this.logger.log(
        `Sent registration completed notification to ${admin.email} for organization ${organization.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send registration completed notification to ${admin.email}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }
}
