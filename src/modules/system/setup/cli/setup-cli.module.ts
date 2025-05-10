import { Module } from '@nestjs/common';
import { SetupCommand } from './commands/setup.command';
import { GenerateTokenCommand } from './commands/generate-token.command';
import { CompleteSetupCommand } from './commands/complete-setup.command';
import { SecurityContextService } from '../services/security-context.service';
import { ConfigModule } from '@nestjs/config';

/**
 * Module for CLI setup commands
 * @description Registers all setup-related CLI commands and their dependencies
 */
@Module({
  imports: [ConfigModule],
  providers: [
    SetupCommand,
    GenerateTokenCommand,
    CompleteSetupCommand,
    SecurityContextService,
  ],
})
export class SetupCliModule {}
