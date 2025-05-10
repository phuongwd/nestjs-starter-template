import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import checkDiskSpace from 'check-disk-space';
import { CheckDiskSpaceFunction } from './interfaces/check-disk-space.interface';
import { CHECK_DISK_SPACE } from './constants';

@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'pretty',
    }),
    PrismaModule,
    ConfigModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: CHECK_DISK_SPACE,
      useValue: checkDiskSpace as CheckDiskSpaceFunction,
    },
    PrismaHealthIndicator,
    HealthService,
  ],
})
export class HealthModule {}
