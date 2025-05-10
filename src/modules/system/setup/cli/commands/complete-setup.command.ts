import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ISetupService } from '../../interfaces/setup-service.interface';
import { SETUP_TOKENS } from '../../constants/setup.constants';
import { Inject } from '@nestjs/common';
import { SecurityContextService } from '../../services/security-context.service';
import { SetupCompletionDto } from '../../dto/setup-completion.dto';
import inquirer from 'inquirer';

interface CompleteSetupOptions {
  token?: string;
  environment?: string;
  force?: boolean;
}

interface SetupAnswers {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

/**
 * CLI command for completing system setup
 * @description Guides users through the setup completion process with interactive prompts
 */
@Command({
  name: 'setup:complete',
  description: 'Complete system setup',
})
@Injectable()
export class CompleteSetupCommand extends CommandRunner {
  private setupToken: string | undefined;
  private environment: string | undefined;

  constructor(
    @Inject(SETUP_TOKENS.SERVICE.SETUP)
    private readonly setupService: ISetupService,
    private readonly securityContext: SecurityContextService,
  ) {
    super();
  }

  @Option({
    flags: '-t, --token <token>',
    description: 'Setup token',
  })
  parseToken(val: string): string {
    if (!/^[a-f0-9]{32}$/.test(val)) {
      throw new Error('Invalid token format');
    }
    this.setupToken = val;
    return val;
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
    this.environment = val;
    return val;
  }

  @Option({
    flags: '-f, --force',
    description: 'Force setup in production environment',
    defaultValue: false,
  })
  parseForce(val: string): boolean {
    return val === 'true';
  }

  private async promptForSetupData(): Promise<SetupCompletionDto> {
    const answers = await inquirer.prompt<SetupAnswers>([
      {
        type: 'input',
        name: 'email',
        message: 'Admin email:',
        validate: (input: string) => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
            return 'Please enter a valid email address';
          }
          return true;
        },
      },
      {
        type: 'password',
        name: 'password',
        message: 'Admin password:',
        validate: (input: string) => {
          if (input.length < 8) {
            return 'Password must be at least 8 characters long';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'firstName',
        message: 'Admin first name:',
        validate: (input: string) => input.length > 0,
      },
      {
        type: 'input',
        name: 'lastName',
        message: 'Admin last name:',
        validate: (input: string) => input.length > 0,
      },
      {
        type: 'input',
        name: 'organizationName',
        message: 'Organization name:',
        validate: (input: string) => input.length > 0,
      },
    ]);

    if (!this.setupToken) {
      throw new Error('Setup token is required');
    }

    const setupData: SetupCompletionDto = {
      email: answers.email,
      password: answers.password,
      firstName: answers.firstName,
      lastName: answers.lastName,
      setupToken: this.setupToken,
      metadata: {
        source: 'cli',
        environment: this.environment || 'development',
        organizationName: answers.organizationName,
      },
    };

    return setupData;
  }

  async run(
    _passedParams: string[],
    options: CompleteSetupOptions,
  ): Promise<void> {
    try {
      // Store token from options if provided
      if (options.token) {
        this.setupToken = options.token;
      }

      // Store environment from options
      this.environment = options.environment;

      // Validate environment
      await this.securityContext.validateEnvironment();

      // Validate token if provided
      if (this.setupToken) {
        const isValid = await this.setupService.validateToken(
          this.setupToken,
          'CLI',
        );
        if (!isValid) {
          throw new Error('Invalid or expired setup token');
        }
      }

      // Get setup data through interactive prompts
      const setupData = await this.promptForSetupData();

      // Complete setup
      await this.setupService.completeSetup(setupData, 'CLI');

      console.log('\n✨ System setup completed successfully!\n');
      console.log(
        'You can now log in to the system with your admin credentials.',
      );
      console.log('\n⚠️  Please keep your credentials secure.');
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Failed to complete setup:', error.message);
      } else {
        console.error(
          '\n❌ Failed to complete setup: An unknown error occurred',
        );
      }
      process.exit(1);
    }
  }
}
