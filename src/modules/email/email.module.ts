import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { EmailService } from './email.service';
import { EMAIL_TOKENS } from './constants/injection-tokens';
import { EmailConfig } from '../../config/email.config';
import { FeatureFlagsConfig } from '../../config/feature-flags.config';

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  enabled: false,
  provider: 'none',
  from: 'noreply@example.com',
  transport: {
    host: 'localhost',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
  },
  defaults: { from: 'noreply@example.com' },
  template: {
    dir: join(__dirname, 'templates'),
    adapter: new HandlebarsAdapter(),
    options: { strict: true },
  },
  isConfigured: false,
};

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Partial<EmailConfig> => {
        const isDevelopment =
          configService.get<string>('NODE_ENV') === 'development';
        const features = configService.get<FeatureFlagsConfig>('features');

        // If email is disabled or features not configured, return minimal config
        if (!features?.email.enabled) {
          return DEFAULT_EMAIL_CONFIG;
        }

        // Helper to get config based on environment and requirements
        const getConfig = <T>(key: string, defaultValue: T): T => {
          // Only throw in production when configuration is required
          if (!isDevelopment && features.email.requireConfiguration) {
            return configService.getOrThrow<T>(key);
          }
          return configService.get<T>(key, defaultValue);
        };

        return {
          transport: {
            host: getConfig<string>('SMTP_HOST', 'smtp.gmail.com'),
            port: getConfig<number>('SMTP_PORT', 587),
            secure: getConfig<boolean>('SMTP_SECURE', false),
            auth: {
              user: getConfig<string>('SMTP_USER', 'test@example.com'),
              pass: getConfig<string>('SMTP_PASS', 'test-password'),
            },
          },
          defaults: {
            from: getConfig<string>('SMTP_FROM', 'test@example.com'),
          },
          template: DEFAULT_EMAIL_CONFIG.template,
        };
      },
    }),
  ],
  providers: [
    {
      provide: EMAIL_TOKENS.SERVICE,
      useClass: EmailService,
    },
  ],
  exports: [EMAIL_TOKENS.SERVICE],
})
export class EmailModule {}
