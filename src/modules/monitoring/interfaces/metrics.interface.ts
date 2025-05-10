import { MetricsResponseDto } from '../dtos/metrics.response.dto';
import { HealthResponseDto } from '../dtos/health.response.dto';

export interface IMetricsService {
  /**
   * Get detailed metrics about permission checks
   */
  getMetrics(): MetricsResponseDto;

  /**
   * Get health status of the permission system
   */
  getHealth(): HealthResponseDto;
}
