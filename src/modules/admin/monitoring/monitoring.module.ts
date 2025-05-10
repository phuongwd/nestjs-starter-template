import { Module } from '@nestjs/common';
import { SystemMonitoringService } from './services/system-monitoring.service';
import { MonitoringController } from './controllers/monitoring.controller';
import { MonitoringRepository } from './repositories/monitoring.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { SystemRolesModule } from '../system-roles/system-roles.module';

/**
 * Admin Monitoring Module
 * @description Handles system monitoring, metrics collection, and alerting
 */
@Module({
  imports: [PrismaModule, SystemRolesModule],
  controllers: [MonitoringController],
  providers: [SystemMonitoringService, MonitoringRepository],
  exports: [SystemMonitoringService],
})
export class AdminMonitoringModule {}
