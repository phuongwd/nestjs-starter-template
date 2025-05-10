import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class CustomMemoryHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const usedMemory = process.memoryUsage().heapUsed;
    const maxMemory = 500 * 1024 * 1024; // 500MB threshold

    const isHealthy = usedMemory < maxMemory;
    const result = this.getStatus(key, isHealthy, {
      usedMemory: `${Math.round(usedMemory / 1024 / 1024)}MB`,
      threshold: `${Math.round(maxMemory / 1024 / 1024)}MB`,
    });

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError('Memory check failed', result);
  }
}
