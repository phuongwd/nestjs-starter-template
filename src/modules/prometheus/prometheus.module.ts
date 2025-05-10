import { Module } from '@nestjs/common';
import { PrometheusController } from './prometheus.controller';
import { PrometheusService } from './prometheus.service';

/**
 * Prometheus Module
 * @description Provides Prometheus metrics endpoint for monitoring
 */
@Module({
  controllers: [PrometheusController],
  providers: [PrometheusService],
  exports: [PrometheusService],
})
export class PrometheusModule {}
