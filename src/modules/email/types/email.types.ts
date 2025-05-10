/**
 * @interface EmailUser
 * @description Minimal user information needed for emails
 */
export interface EmailUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * @type EmailTemplateData
 * @description Type for email template data
 */
export type EmailTemplateData = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * @interface EmailParams
 * @description Parameters for sending an email
 */
export interface EmailParams {
  to: string;
  templateId: string;
  data: EmailTemplateData;
}
