import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ISetupService } from '../../interfaces/setup-service.interface';
import { SETUP_TOKENS } from '../../constants/setup.constants';
import { Inject } from '@nestjs/common';
import { SecurityContextService } from '../../services/security-context.service';

interface GenerateTokenOptions {
  environment?: string;
  force?: boolean;
  expiresIn?: number;
}

/**
 * CLI command for generating setup tokens
 * @description Generates secure tokens for system setup with environment validation
 */
@Command({
  name: 'setup:generate-token',
  description: 'Generate a setup token',
})
@Injectable()
export class GenerateTokenCommand extends CommandRunner {
  constructor(
    @Inject(SETUP_TOKENS.SERVICE.SETUP)
    private readonly setupService: ISetupService,
    private readonly securityContext: SecurityContextService,
  ) {
    super();
  }

  @Option({
    flags: '-e, --environment <environment>',
    description: 'Target environment (development, staging, production)',
    defaultValue: 'development',
  })
  parseEnvironment(val: string): string {
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(val)) {
      throw new Error(
        `Invalid environment. Must be one of: ${validEnvironments.join(', ')}`,
      );
    }
    return val;
  }

  @Option({
    flags: '-f, --force',
    description: 'Force token generation in production environment',
    defaultValue: false,
  })
  parseForce(val: string): boolean {
    return val === 'true';
  }

  @Option({
    flags: '--expires-in <minutes>',
    description: 'Token expiration time in minutes',
    defaultValue: 60,
  })
  parseExpiresIn(val: string): number {
    const minutes = parseInt(val, 10);
    if (isNaN(minutes) || minutes < 1) {
      throw new Error('Expiration time must be a positive number of minutes');
    }
    return minutes;
  }

  async run(_: string[], options: GenerateTokenOptions): Promise<void> {
    try {
      // Validate environment
      await this.securityContext.validateEnvironment();

      // Generate token
      const token = await this.setupService.generateToken(
        'CLI',
        options.environment,
      );

      console.log('\n✨ Setup token generated successfully!\n');
      console.log('Token:', token.token);
      console.log('Expires:', token.expiresAt);
      console.log(
        '\n⚠️  Keep this token secure and use it to complete the setup process.',
      );
      console.log(
        'The token can only be used once and will expire after the specified time.\n',
      );
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Failed to generate setup token:', error.message);
      } else {
        console.error(
          '\n❌ Failed to generate setup token: An unknown error occurred',
        );
      }
      process.exit(1);
    }
  }
}
