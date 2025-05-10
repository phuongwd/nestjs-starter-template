import { Module } from '@nestjs/common';
import { StartupLogger } from './startup.logger';

@Module({
  providers: [StartupLogger],
  exports: [StartupLogger],
})
export class LoggerModule {}
