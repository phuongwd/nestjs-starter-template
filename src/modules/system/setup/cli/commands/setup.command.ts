import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ISetupService } from '../../interfaces/setup-service.interface';
import { SETUP_TOKENS } from '../../constants/setup.constants';
import { Inject } from '@nestjs/common';
import { SecurityContextService } from '../../services/security-context.service';

interface SetupCommandOptions {
  environment?: string;
  force?: boolean;
}

/**
 * CLI command for system setup operations
 * @description Provides CLI interface for generating setup tokens and completing system setup
 */
@Command({
  name: 'setup',
  description: 'System setup operations',
})
@Injectable()
export class SetupCommand extends CommandRunner {
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
    description: 'Force setup in production environment',
    defaultValue: false,
  })
  parseForce(val: string): boolean {
    return val === 'true';
  }

  async run(
    _passedParams: string[],
    options: SetupCommandOptions,
  ): Promise<void> {
    // Validate environment
    await this.securityContext.validateEnvironment();

    // Check if setup is required
    const isRequired = await this.setupService.isSetupRequired();
    if (!isRequired) {
      console.log('⚠️  System is already set up');
      return;
    }

    console.log(
      `📋 Available setup commands for ${options.environment} environment:`,
    );
    console.log('  generate-token  Generate a setup token');
    console.log('  complete       Complete system setup');
    console.log('\nRun setup:<command> --help for more information');
  }
}
