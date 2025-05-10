import { Module } from '@nestjs/common';
import { PermissionMetricsController } from './controllers/permission-metrics.controller';
import { MetricsService } from './services/metrics.service';
import { INJECTION_TOKENS } from './constants/injection-tokens';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [PermissionMetricsController],
  providers: [
    {
      provide: INJECTION_TOKENS.SERVICE.METRICS,
      useClass: MetricsService,
    },
  ],
})
export class MonitoringModule {}
