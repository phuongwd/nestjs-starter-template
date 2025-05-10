import { registerAs } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

/**
 * Email configuration structure
 */
export interface EmailConfig {
  enabled: boolean;
  provider: string;
  from: string;
  transport: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  defaults: {
    from: string;
  };
  template: {
    dir: string;
    adapter: HandlebarsAdapter;
    options: {
      strict: boolean;
    };
  };
  isConfigured: boolean; // Flag to indicate if email is properly configured
}

/**
 * Email configuration provider
 * Supports multiple email service providers through SMTP
 *
 * Supported providers:
 * - Gmail SMTP
 * - Mailgun SMTP
 * - SendGrid SMTP
 * - Amazon SES SMTP
 * - Custom SMTP
 * - None (disabled)
 *
 * @example
 * ```typescript
 * // Access in a service
 * @Injectable()
 * class MyService {
 *   constructor(private configService: ConfigService) {
 *     const emailConfig = this.configService.get<EmailConfig>('email');
 *     if (emailConfig.enabled && emailConfig.isConfigured) {
 *       // Use email service
 *     }
 *   }
 * }
 * ```
 */
export const emailConfig = registerAs('email', (): EmailConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'smtp';
  const isEnabled = process.env.FEATURE_EMAIL_ENABLED !== 'false';

  // Check if required SMTP settings are provided
  const hasSmtpConfig = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );

  // If email is disabled, return minimal config
  if (!isEnabled || provider === 'none') {
    return {
      enabled: false,
      provider: 'none',
      from: 'noreply@example.com',
      transport: {
        host: 'localhost',
        port: 25,
        secure: false,
        auth: { user: '', pass: '' },
      },
      defaults: { from: 'noreply@example.com' },
      template: {
        dir: join(__dirname, '../modules/organizations/templates'),
        adapter: new HandlebarsAdapter(),
        options: { strict: true },
      },
      isConfigured: false,
    };
  }

  // Default configuration
  const config: EmailConfig = {
    enabled: isEnabled,
    provider,
    from: process.env.SMTP_FROM || 'noreply@example.com',
    transport: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    defaults: {
      from: process.env.SMTP_FROM || 'noreply@example.com',
    },
    template: {
      dir: join(__dirname, '../modules/organizations/templates'),
      adapter: new HandlebarsAdapter(),
      options: {
        strict: true,
      },
    },
    isConfigured: hasSmtpConfig,
  };

  // Provider-specific configurations
  if (hasSmtpConfig) {
    switch (provider) {
      case 'mailgun':
        config.transport = {
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILGUN_SMTP_USER || '',
            pass: process.env.MAILGUN_SMTP_PASS || '',
          },
        };
        break;

      case 'sendgrid':
        config.transport = {
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY || '',
          },
        };
        break;

      case 'ses':
        config.transport = {
          host: 'email-smtp.us-east-1.amazonaws.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.AWS_SES_ACCESS_KEY || '',
            pass: process.env.AWS_SES_SECRET_KEY || '',
          },
        };
        break;

      case 'gmail':
        config.transport = {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.GMAIL_USER || '',
            pass: process.env.GMAIL_APP_PASSWORD || '',
          },
        };
        break;
    }
  }

  // Development fallback
  if (isDevelopment && !hasSmtpConfig) {
    config.transport = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'test-password',
      },
    };
    config.isConfigured = false; // Mark as not properly configured in development
  }

  return config;
});

export default emailConfig;
